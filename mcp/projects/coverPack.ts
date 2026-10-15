import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import sharp from "sharp";
import { COVER_OG, COVER_SLOTS, type CoverSlot } from "../../src/lib/coverPack";
import type { CoverPack } from "../../src/types";

/**
 * Pacote de capas vindo do Claude Design (skill portfolio-capas): lê a pasta
 * ou o .zip, confere cada arte contra COVER_SLOTS e prepara os arquivos.
 * Sem rede — o servidor envia e grava o que sair daqui.
 *
 * O contrato são os nomes: `card-light.svg`, `card-dark.svg`,
 * `card-mobile-light.svg`, `hero-dark.svg`, `square-light.svg`, `og.svg`...
 * Um nome desconhecido é erro, e não aviso: a arte mal batizada sumiria do
 * site sem ninguém perceber.
 */

export type Theme = "light" | "dark";
type ArtSlot = CoverSlot | "og";

export interface PackFile {
  name: string;
  body: Buffer;
}

export interface PlannedArt {
  slot: ArtSlot;
  theme?: Theme;
  /** Nome no pacote. */
  source: string;
  ext: string;
  body: Buffer;
  width: number;
  height: number;
  /** Luminância média (0 escuro – 1 claro), para conferir os temas. */
  luminance: number;
}

export interface PackPlan {
  arts: PlannedArt[];
  /** Arquivos do pacote que não são arte (prancha de revisão, pack.json...). */
  ignored: string[];
  warnings: string[];
  /** `projeto` do pack.json, quando houver. */
  projeto?: string;
}

const MAX_FILES = 60;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const MAX_SVG_BYTES = 2 * 1024 * 1024;
const HEAVY_SVG_BYTES = 400 * 1024;
const MAX_RASTER_BYTES = 15 * 1024 * 1024;
/** Arte raster sobe em WebP até esta largura: o topo da página passa de 1300 px em telas retina. */
const MAX_RASTER_WIDTH = 2400;
const ASPECT_TOLERANCE = 0.01;

const SLOT_BY_FILE = new Map<string, CoverSlot>(
  (Object.entries(COVER_SLOTS) as [CoverSlot, (typeof COVER_SLOTS)[CoverSlot]][]).map(([slot, spec]) => [spec.file, slot]),
);
const ART_NAME = /^(card-mobile|card|hero|square)-(light|dark)\.(svg|png|webp|jpe?g)$/i;
const OG_NAME = /^og(?:-light)?\.(svg|png|webp|jpe?g)$/i;
const IMAGE_EXT = /\.(svg|png|webp|jpe?g|gif|avif)$/i;

export const EXPECTED_NAMES = [
  ...Object.values(COVER_SLOTS).flatMap((spec) => [`${spec.file}-light.svg`, `${spec.file}-dark.svg`]),
  `${COVER_OG.file}.svg`,
];

function normalizeExt(ext: string): string {
  const lower = ext.toLowerCase();
  return lower === ".jpeg" ? ".jpg" : lower;
}

/** Arquivos que o sistema ou o exportador põem no pacote e não interessam. */
function isJunk(name: string): boolean {
  return name.split("/").some((part) => part.startsWith(".") || part === "__MACOSX");
}

/** Lê a pasta (com subpastas) ou o .zip exportado. */
export async function readPackSource(source: string): Promise<PackFile[]> {
  const stat = await fs.stat(source).catch(() => null);
  if (!stat) throw new Error(`Não encontrei "${source}". Informe o caminho absoluto da pasta ou do .zip do pacote.`);

  const files: PackFile[] = [];
  let total = 0;
  const add = (name: string, body: Buffer) => {
    if (files.length >= MAX_FILES) throw new Error(`O pacote tem mais de ${MAX_FILES} arquivos — é a pasta certa?`);
    total += body.length;
    if (total > MAX_TOTAL_BYTES) throw new Error("O pacote passa de 40 MB.");
    files.push({ name, body });
  };

  if (stat.isDirectory()) {
    const entries = (await fs.readdir(source, { recursive: true })).map(String).sort();
    for (const entry of entries) {
      const full = path.join(source, entry);
      const normalized = entry.split(path.sep).join("/");
      if (isJunk(normalized) || !(await fs.stat(full)).isFile()) continue;
      add(normalized, await fs.readFile(full));
    }
  } else if (/\.zip$/i.test(source)) {
    const zip = await JSZip.loadAsync(await fs.readFile(source));
    for (const entry of Object.values(zip.files)) {
      if (entry.dir || isJunk(entry.name)) continue;
      add(entry.name, await entry.async("nodebuffer"));
    }
  } else {
    throw new Error("Envie a pasta do pacote ou o .zip exportado — não um arquivo solto.");
  }
  if (!files.length) throw new Error("O pacote está vazio.");
  return files;
}

/**
 * Confere um SVG: precisa funcionar dentro de <img>, onde scripts, fontes da
 * web e arquivos externos não carregam, e não pode trazer nada executável
 * para quem abrir o arquivo direto pelo link do Storage.
 */
export function inspectSvg(text: string, name: string): { width: number; height: number; warnings: string[] } {
  const fail = (why: string): never => {
    throw new Error(`${name}: ${why}`);
  };
  const root = /<svg\b[^>]*>/i.exec(text)?.[0] ?? fail("não é um SVG.");
  if (/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(text)) fail("declara entidades XML; exporte sem DOCTYPE.");
  if (/<script\b/i.test(text)) fail("tem <script>; tire o código do arquivo.");
  if (/<(foreignObject|iframe|embed|object|audio|video|canvas)\b/i.test(text)) fail("tem HTML embutido (foreignObject, iframe...); desenhe só com formas do SVG.");
  if (/\son[a-z]+\s*=/i.test(text)) fail("tem atributos de evento (onclick, onload...); tire-os.");
  if (/javascript:/i.test(text)) fail("tem um link javascript:.");
  if (/href\s*=\s*["'](?!\s*(?:#|data:image\/(?:png|jpe?g|webp|gif);base64,))/i.test(text)) {
    fail("aponta para um arquivo externo (href). Dentro de <img> ele não carrega: embuta como data:image/...;base64 ou desenhe com formas.");
  }
  if (/@import|url\((?!\s*["']?\s*(?:#|data:))/i.test(text)) fail("carrega CSS ou fonte de fora (@import / url(...)); embuta ou tire.");

  const number = (attr: string) => {
    const match = new RegExp(`\\s${attr}\\s*=\\s*["']\\s*([\\d.]+)(px)?\\s*["']`, "i").exec(root);
    return match ? Number(match[1]) : NaN;
  };
  const viewBox = /\sviewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i.exec(root);
  const width = viewBox ? Number(viewBox[3]) : number("width");
  const height = viewBox ? Number(viewBox[4]) : number("height");
  if (!(width > 0 && height > 0)) fail('sem viewBox; use, por exemplo, viewBox="0 0 1600 900".');

  const warnings: string[] = [];
  if (/<text\b/i.test(text)) {
    warnings.push(`${name}: tem <text>. Dentro de <img> as fontes do site não carregam e o texto sai na fonte do sistema de cada visitante — prefira converter em formas.`);
  }
  return { width, height, warnings };
}

function parseName(name: string): { slot: ArtSlot; theme?: Theme; ext: string } | null {
  const base = name.split("/").pop()!;
  const art = ART_NAME.exec(base);
  if (art) return { slot: SLOT_BY_FILE.get(art[1].toLowerCase())!, theme: art[2].toLowerCase() as Theme, ext: normalizeExt(`.${art[3]}`) };
  const og = OG_NAME.exec(base);
  if (og) return { slot: "og", ext: normalizeExt(`.${og[1]}`) };
  return null;
}

function expectedSize(slot: ArtSlot): { width: number; height: number } {
  return slot === "og" ? COVER_OG : COVER_SLOTS[slot];
}

function label(art: { slot: ArtSlot; theme?: Theme }): string {
  return art.theme ? `${art.slot}/${art.theme}` : art.slot;
}

async function luminanceOf(body: Buffer, theme: Theme | undefined): Promise<{ luminance: number; opaque: boolean }> {
  const image = sharp(body, { limitInputPixels: 50_000_000 });
  const opaque = (await image.clone().stats()).isOpaque;
  // Contra o fundo do quadro no site: um SVG transparente aparece sobre ele.
  const background = theme === "dark" ? "#1d2233" : "#f7f7fb";
  const { channels } = await image.resize(48).flatten({ background }).stats();
  const [r, g, b] = channels.map((c) => c.mean / 255);
  return { luminance: 0.2126 * r + 0.7152 * g + 0.0722 * b, opaque };
}

/** Confere o pacote inteiro. Lança erro com a lista do que corrigir; avisos não impedem. */
export async function planCoverPack(files: PackFile[]): Promise<PackPlan> {
  const arts: PlannedArt[] = [];
  const ignored: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const unknown: string[] = [];
  let projeto: string | undefined;

  for (const file of files) {
    const base = file.name.split("/").pop()!;
    if (base.toLowerCase() === "pack.json") {
      try {
        const manifest = JSON.parse(file.body.toString("utf8"));
        if (typeof manifest?.projeto === "string") projeto = manifest.projeto;
      } catch {
        warnings.push("pack.json não é um JSON válido; ignorado.");
      }
      ignored.push(file.name);
      continue;
    }
    const parsed = parseName(file.name);
    if (!parsed) {
      (IMAGE_EXT.test(base) ? unknown : ignored).push(file.name);
      continue;
    }

    try {
      const spec = expectedSize(parsed.slot);
      let width: number;
      let height: number;
      if (parsed.ext === ".svg") {
        if (file.body.length > MAX_SVG_BYTES) throw new Error(`${file.name}: passa de 2 MB — há imagem pesada embutida?`);
        if (file.body.length > HEAVY_SVG_BYTES) warnings.push(`${file.name}: ${Math.round(file.body.length / 1024)} kB; acima de 400 kB o cartão demora a aparecer no celular.`);
        const svg = inspectSvg(file.body.toString("utf8"), file.name);
        ({ width, height } = svg);
        warnings.push(...svg.warnings);
      } else {
        if (file.body.length > MAX_RASTER_BYTES) throw new Error(`${file.name}: passa de 15 MB.`);
        const meta = await sharp(file.body).metadata();
        width = meta.width ?? 0;
        height = meta.height ?? 0;
        if (width < spec.width) {
          warnings.push(`${file.name}: ${width} px de largura; o lugar pede ${spec.width} px ou mais (ou SVG) para não ficar borrado.`);
        }
      }
      const ratio = width / height;
      const target = spec.width / spec.height;
      if (Math.abs(ratio - target) / target > ASPECT_TOLERANCE) {
        throw new Error(`${file.name}: proporção ${width}×${height}; o lugar pede ${spec.width}×${spec.height}.`);
      }
      const { luminance, opaque } = await luminanceOf(file.body, parsed.theme).catch(() => {
        throw new Error(`${file.name}: não consegui desenhar o arquivo — ele abre num navegador?`);
      });
      if (!opaque && parsed.slot !== "og") warnings.push(`${file.name}: fundo transparente; o quadro do site aparece por trás. Prefira um fundo próprio.`);
      if (arts.some((art) => art.slot === parsed.slot && art.theme === parsed.theme)) {
        throw new Error(`${file.name}: há mais de um arquivo para ${label(parsed)}.`);
      }
      arts.push({ ...parsed, source: file.name, body: file.body, width, height, luminance });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (unknown.length) {
    errors.push(`Nomes que não reconheço: ${unknown.join(", ")}. Use: ${EXPECTED_NAMES.join(", ")} (PNG/WebP/JPG também valem).`);
  }
  const find = (slot: ArtSlot, theme?: Theme) => arts.find((art) => art.slot === slot && art.theme === theme);
  if (!find("card", "light") && !errors.some((e) => e.includes("card-light."))) {
    errors.push("Falta card-light.svg: o cartão claro é a única arte obrigatória.");
  }
  if (errors.length) throw new Error(`O pacote precisa de ajustes:\n- ${errors.join("\n- ")}`);

  for (const slot of Object.keys(COVER_SLOTS) as CoverSlot[]) {
    const light = find(slot, "light");
    const dark = find(slot, "dark");
    if (dark && !light) warnings.push(`${COVER_SLOTS[slot].file}-dark: sem a versão clara, fica de fora (cada lugar precisa da clara).`);
    if (light && dark && dark.luminance > light.luminance) {
      warnings.push(`${slot}: a versão escura está mais clara que a clara — os arquivos não estão trocados?`);
    }
    if (dark && dark.luminance > 0.55) warnings.push(`${COVER_SLOTS[slot].file}-dark: fundo claro demais para o tema escuro.`);
  }
  if (find("card", "dark") && find("cardMobile", "light") && !find("cardMobile", "dark")) {
    warnings.push("card-mobile não tem versão escura: no celular, o tema escuro mostra a clara.");
  }
  if (!find("og")) warnings.push("Sem og.svg: a prévia do link vai ser o cartão claro recortado em 1200×630.");

  return { arts, ignored, warnings, projeto };
}

/** Arte pronta para o Storage: SVG como veio; raster em WebP. */
export async function prepareArt(art: PlannedArt): Promise<{ body: Buffer; ext: string }> {
  if (art.ext === ".svg") return { body: art.body, ext: ".svg" };
  const body = await sharp(art.body)
    .rotate()
    .resize({ width: MAX_RASTER_WIDTH, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();
  return { body, ext: ".webp" };
}

/**
 * Prévia do link: JPEG 1200×630 de até 300 kB, a partir do og do pacote ou do
 * cartão claro. A densidade alta faz o SVG ser desenhado já grande, em vez de
 * ampliado depois.
 */
export async function renderOgImage(source: PlannedArt): Promise<Buffer> {
  const density = source.ext === ".svg" ? Math.min(600, Math.max(72, Math.ceil((72 * COVER_OG.width * 2) / source.width))) : undefined;
  const base = sharp(source.body, density ? { density } : {})
    .resize(COVER_OG.width, COVER_OG.height, { fit: "cover", position: "centre" })
    .flatten({ background: "#ffffff" });
  for (const quality of [88, 80, 72, 64, 56]) {
    const body = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (body.length <= COVER_OG.maxBytes) return body;
  }
  throw new Error("A prévia do link não coube em 300 kB nem com compressão forte; simplifique og.svg (menos textura e gradientes finos).");
}

/** Monta o `coverPack` do projeto a partir das referências enviadas. */
export function buildCoverPack(refs: { slot: ArtSlot; theme?: Theme; ref: string }[]): CoverPack {
  const pack: CoverPack = {};
  for (const { slot, theme, ref } of refs) {
    if (slot === "og") {
      pack.og = ref;
      continue;
    }
    const current = pack[slot];
    if (theme === "dark") pack[slot] = { light: current?.light ?? "", dark: ref };
    else pack[slot] = { ...current, light: ref };
  }
  // Só a versão escura de um lugar: sem a clara não há o que mostrar no tema claro.
  for (const slot of Object.keys(COVER_SLOTS) as CoverSlot[]) {
    if (pack[slot] && !pack[slot]!.light) delete pack[slot];
  }
  return pack;
}

/** Referências `db:` de um pacote, para listar o que a versão anterior deixa no Storage. */
export function coverPackRefs(pack: CoverPack | undefined): string[] {
  if (!pack) return [];
  const { og, ...slots } = pack;
  return [...Object.values(slots).flatMap((art) => (art ? [art.light, art.dark] : [])), og].filter((ref): ref is string => Boolean(ref));
}
