import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { slugify } from "../../src/utils/slug";
import { getSupabase } from "./supabase";

/**
 * Arquivos do bucket `images`, com as mesmas convenções do painel
 * (src/utils/imageDb.ts): o conteúdo cita um arquivo como `db:<caminho>`,
 * imagens de projeto ficam em `projects/<codigo>/`, as demais em `geral/`, e o
 * recorte de capa de `x.png` é `x.png.capa.webp`.
 *
 * Aquele módulo não é importado aqui porque cria o cliente do navegador ao
 * carregar; as poucas regras de caminho estão repetidas abaixo.
 */

export const BUCKET = "images";
export const GENERAL_FOLDER = "geral";
const COVER_SUFFIX = ".capa.webp";
const MAX_BYTES = 20 * 1024 * 1024;
/** Mesmos limites do painel (src/utils/imageOptimizer.ts e src/lib/coverAspect.ts). */
export const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 80;

export function coverPathFor(originalPath: string): string {
  return `${originalPath}${COVER_SUFFIX}`;
}
export function originalPathFor(p: string): string {
  return p.endsWith(COVER_SUFFIX) ? p.slice(0, -COVER_SUFFIX.length) : p;
}
export function isCoverCrop(p: string): boolean {
  return p.endsWith(COVER_SUFFIX);
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};
const EXT_BY_MIME = Object.fromEntries(Object.entries(MIME).map(([ext, mime]) => [mime, ext]));
/** Formatos que passam pelo sharp. GIF (animação), SVG e PDF sobem intactos. */
const RASTER = new Set([".png", ".jpg", ".webp"]);

function normalizeExt(ext: string): string {
  const lower = ext.toLowerCase();
  return lower === ".jpeg" ? ".jpg" : lower;
}

/** Aceita `db:pasta/a.png` ou `pasta/a.png`; recusa caminhos que escapam do bucket. */
export function refToPath(ref: string): string {
  const p = ref.trim().replace(/^db:/, "").replace(/^\/+/, "");
  if (!p || p.split("/").some((part) => part === ".." || part === ".")) {
    throw new Error(`Referência de imagem inválida: "${ref}".`);
  }
  return p;
}

export function folderOf(p: string): string {
  return p.split("/").slice(0, -1).join("/");
}

export function contentTypeFor(p: string): string {
  return MIME[normalizeExt(path.extname(p))] || "application/octet-stream";
}

export interface PreparedImage {
  body: Buffer;
  ext: string;
}

/**
 * Otimiza como o banco de imagens do painel: no máximo 1600 px e WebP, exceto
 * GIF/SVG/PDF. `keepFormat` mantém PNG/JPG (útil para diagramas com texto fino).
 */
export async function prepareImage(body: Buffer, ext: string, { keepFormat = false } = {}): Promise<PreparedImage> {
  ext = normalizeExt(ext);
  if (!MIME[ext]) throw new Error(`Formato não aceito: "${ext || "sem extensão"}". Use ${Object.keys(MIME).join(", ")}.`);
  if (body.length > MAX_BYTES) throw new Error("A imagem passa de 20 MB.");
  if (!RASTER.has(ext)) return { body, ext };

  const pipeline = sharp(body)
    .rotate() // aplica a orientação da câmera e descarta o EXIF (inclusive GPS)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true });
  if (keepFormat) return { body: await pipeline.toBuffer(), ext };
  return { body: await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer(), ext: ".webp" };
}

/** Lê a imagem de um arquivo local ou de uma URL https. */
export async function readSource(source: { filePath?: string; url?: string }): Promise<{ body: Buffer; ext: string; name: string }> {
  if (source.filePath) {
    const stat = await fs.stat(source.filePath).catch(() => null);
    if (!stat?.isFile()) throw new Error(`Arquivo não encontrado: ${source.filePath}`);
    if (stat.size > MAX_BYTES) throw new Error("A imagem passa de 20 MB.");
    const parsed = path.parse(source.filePath);
    return { body: await fs.readFile(source.filePath), ext: parsed.ext, name: parsed.name };
  }
  if (source.url) {
    if (!/^https:\/\//i.test(source.url)) throw new Error("Use uma URL https.");
    const response = await fetch(source.url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Download falhou: HTTP ${response.status}.`);
    const body = Buffer.from(await response.arrayBuffer());
    const mime = (response.headers.get("content-type") || "").split(";")[0].trim();
    const parsed = path.parse(new URL(source.url).pathname);
    return { body, ext: EXT_BY_MIME[mime] || parsed.ext, name: parsed.name };
  }
  throw new Error("Informe `filePath` ou `url`.");
}

/**
 * Grava no bucket. Sem `upsert`, um caminho ocupado ganha sufixo em vez de
 * ser sobrescrito: o CDN guarda cada caminho por um ano, e quem já viu a
 * imagem antiga continuaria vendo-a. Devolve o caminho final.
 */
export async function putObject(objectPath: string, body: Buffer, { upsert = false } = {}): Promise<string> {
  const supabase = await getSupabase();
  const ext = path.extname(objectPath);
  const stem = objectPath.slice(0, objectPath.length - ext.length);
  const candidates = upsert ? [objectPath] : [objectPath, `${stem}-${Date.now().toString(36)}${ext}`];
  for (const candidate of candidates) {
    const { error } = await supabase.storage.from(BUCKET).upload(candidate, body, {
      contentType: contentTypeFor(candidate),
      upsert,
      cacheControl: "31536000",
    });
    if (!error) return candidate;
    if (!/exists|duplicate/i.test(error.message)) throw new Error(`Envio da imagem falhou: ${error.message}`);
  }
  throw new Error("Já existe uma imagem com esse nome. Escolha outro nome de arquivo.");
}

export interface UploadedImage {
  /** Referência para o conteúdo: `db:projects/x/arquivo.webp`. */
  ref: string;
  path: string;
  bytes: number;
}

export async function uploadImage(
  source: { filePath?: string; url?: string },
  folder: string,
  { fileName, keepFormat }: { fileName?: string; keepFormat?: boolean } = {},
): Promise<UploadedImage> {
  const raw = await readSource(source);
  const image = await prepareImage(raw.body, raw.ext, { keepFormat });
  const base = slugify(path.parse(fileName || raw.name).name) || "imagem";
  const finalPath = await putObject(`${refToPath(folder)}/${base}${image.ext}`, image.body);
  return { ref: `db:${finalPath}`, path: finalPath, bytes: image.body.length };
}

export async function downloadObject(objectPath: string): Promise<Buffer> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.storage.from(BUCKET).download(objectPath);
  if (error || !data) throw new Error(`Imagem "${objectPath}" não encontrada no Storage.`);
  return Buffer.from(await data.arrayBuffer());
}

/** Cópia local, para a IA poder abrir e olhar a imagem antes de editá-la. */
export async function saveLocalCopy(objectPath: string, body: Buffer): Promise<string> {
  const file = path.join(os.tmpdir(), "portfolio-mcp", ...objectPath.split("/"));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
  return file;
}

export async function publicUrl(objectPath: string): Promise<string> {
  const supabase = await getSupabase();
  return supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

export interface StoredObject {
  path: string;
  bytes: number;
  addedAt: string | null;
}

/** Arquivos e subpastas sob `prefix`; com `recursive`, desce até 3 níveis como o painel. */
export async function listObjects(prefix = "", { recursive = false } = {}): Promise<{ files: StoredObject[]; folders: string[] }> {
  const supabase = await getSupabase();
  const files: StoredObject[] = [];
  const folders: string[] = [];

  async function walk(current: string, depth: number): Promise<void> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(current, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(`Não foi possível listar "${current || "/"}": ${error.message}`);
    const nested: Promise<void>[] = [];
    for (const item of data ?? []) {
      if (!item.name || item.name === ".emptyFolderPlaceholder") continue;
      const itemPath = current ? `${current}/${item.name}` : item.name;
      if (item.id === null) {
        folders.push(itemPath);
        if (recursive && depth < 3) nested.push(walk(itemPath, depth + 1));
      } else {
        files.push({
          path: itemPath,
          bytes: (item.metadata as { size?: number } | null)?.size ?? 0,
          addedAt: item.created_at ?? null,
        });
      }
    }
    await Promise.all(nested);
  }

  await walk(prefix ? refToPath(prefix).replace(/\/+$/, "") : "", 0);
  files.sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
  return { files, folders: folders.sort() };
}

export async function objectExists(objectPath: string): Promise<boolean> {
  const folder = folderOf(objectPath);
  const name = objectPath.slice(folder ? folder.length + 1 : 0);
  const supabase = await getSupabase();
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { search: name, limit: 100 });
  if (error) throw new Error(`Não foi possível consultar o Storage: ${error.message}`);
  return (data ?? []).some((item) => item.name === name && item.id !== null);
}

export async function moveObject(from: string, to: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.storage.from(BUCKET).move(from, to);
  if (error) throw new Error(`Não foi possível mover "${from}": ${error.message}`);
}

export async function removeObjects(paths: string[]): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw new Error(`Não foi possível apagar: ${error.message}`);
}
