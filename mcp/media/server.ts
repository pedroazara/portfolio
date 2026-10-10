import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import sharp from "sharp";
import { z } from "zod";
import { findBySlug, slugify } from "../../src/utils/slug";
import { logFileEdit, noteParam, trackClient, type EditInfo } from "../core/editLog";
import { SITE_URL } from "../core/env";
import {
  GENERAL_FOLDER,
  coverPathFor,
  downloadObject,
  folderOf,
  isCoverCrop,
  listObjects,
  moveObject,
  objectExists,
  originalPathFor,
  publicUrl,
  putObject,
  refToPath,
  removeObjects,
  saveLocalCopy,
  uploadImage,
} from "../core/images";
import { readPortfolio, updatePortfolio } from "../core/portfolioDocument";
import { findImageUsage, replaceImageRef } from "../core/references";
import { reply } from "../core/reply";
import {
  IMAGE_SLOTS,
  TEXT_TARGETS,
  applyEdits,
  editOperationsShape,
  insertBlock,
  markdownImage,
  placeImage,
  regionSchema,
  renderCover,
} from "./mediaOps";

/**
 * Servidor MCP "portfolio-media": o banco de imagens do site. Lista, envia,
 * edita, recorta capas, move e apaga arquivos do bucket `images`, e coloca
 * imagens em qualquer lugar do conteúdo — mantendo as referências em dia.
 */

const INSTRUCTIONS = `Gerencia as imagens do portfólio pessoal (${SITE_URL}), guardadas no Supabase Storage.
O conteúdo cita uma imagem como "db:<caminho>" (ex.: db:projects/yolocraft/print.webp).

Regras:
- Pastas: projects/<codigo-do-projeto>/ para imagens de projeto; geral/ para o resto.
- Antes de editar ou recortar, use get_image: ele salva uma cópia local (localPath) que você pode abrir para ver a imagem.
- Editar nunca sobrescreve o original: cria um arquivo novo. Com replaceReferences: true, o site passa a usar o novo.
- move_image e delete_image cuidam das referências: mover atualiza o conteúdo; apagar recusa imagens em uso (a não ser com force).
- Capas usam recorte 16:9 (crop_cover), salvo como "<original>.capa.webp". Depois aplique com set_image.
- Imagens no Markdown: insert_image_in_text. O texto alternativo vira a legenda exibida no site.
- Ao mexer em conteúdo, cada gravação guarda localmente uma cópia do documento anterior (backupPath).`;

const server = new McpServer({ name: "portfolio-media", version: "0.1.0" }, { instructions: INSTRUCTIONS });
trackClient(server, "portfolio-media");

const refParam = z.string().min(1).describe("Imagem: `db:caminho` ou só o caminho no bucket.");
const dryRunParam = z.boolean().optional().describe("true mostra o que mudaria, sem gravar.");

/** Grava o conteúdo com a operação de arquivo junto; sem mudança no conteúdo, só anota a operação. */
async function recordFileOnly(edit: EditInfo, written: boolean) {
  if (!written) await logFileEdit(edit);
}

/** Onde a imagem aparece; um recorte de capa em uso mantém o original necessário. */
function usageOf(usage: Map<string, string[]>, objectPath: string): string[] {
  const direct = usage.get(objectPath) ?? [];
  if (isCoverCrop(objectPath)) return direct;
  const viaCrop = (usage.get(coverPathFor(objectPath)) ?? []).map((location) => `${location} (pelo recorte de capa)`);
  return [...direct, ...viaCrop];
}

async function assertStored(ref: string | null) {
  if (ref?.startsWith("db:") && !(await objectExists(refToPath(ref)))) {
    throw new Error(`"${ref}" não existe no Storage. Envie com upload_image ou confira com list_images.`);
  }
}

server.registerTool(
  "list_images",
  {
    title: "Listar imagens",
    description: "Lista as imagens do bucket (mais recentes primeiro), com as pastas e onde cada uma é usada no site.",
    inputSchema: {
      folder: z.string().optional().describe("Pasta (ex.: projects/yolocraft). Padrão: todas."),
      includeCrops: z.boolean().optional().describe("Incluir recortes de capa (.capa.webp). Padrão: false."),
      unusedOnly: z.boolean().optional().describe("Só as que nenhum conteúdo usa."),
      limit: z.number().int().min(1).max(1000).optional().describe("Máximo de itens (padrão 200)."),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ folder, includeCrops = false, unusedOnly = false, limit = 200 }) => {
    const [{ files, folders }, { data }] = await Promise.all([listObjects(folder, { recursive: true }), readPortfolio()]);
    const usage = findImageUsage(data);
    const images = files
      .filter((file) => includeCrops || !isCoverCrop(file.path))
      .map((file) => ({ ref: `db:${file.path}`, bytes: file.bytes, addedAt: file.addedAt, usedIn: usageOf(usage, file.path) }))
      .filter((image) => !unusedOnly || image.usedIn.length === 0);
    return reply({ folders, total: images.length, images: images.slice(0, limit) });
  },
);

server.registerTool(
  "get_image",
  {
    title: "Ver imagem",
    description:
      "Detalhes de uma imagem: dimensões, formato, tamanho, URL pública, onde é usada e se tem recorte de capa. " +
      "Salva uma cópia local (localPath) que pode ser aberta para ver a imagem.",
    inputSchema: {
      ref: refParam,
      download: z.boolean().optional().describe("Salvar cópia local (padrão: true)."),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ ref, download = true }) => {
    const objectPath = refToPath(ref);
    const [body, { data }] = await Promise.all([downloadObject(objectPath), readPortfolio()]);
    const meta = await sharp(body).metadata().catch(() => null);
    const crop = isCoverCrop(objectPath) ? null : coverPathFor(objectPath);
    return reply({
      ref: `db:${objectPath}`,
      url: await publicUrl(objectPath),
      bytes: body.length,
      width: meta?.width,
      height: meta?.height,
      format: meta?.format ?? path.extname(objectPath).slice(1),
      usedIn: usageOf(findImageUsage(data), objectPath),
      coverCrop: crop && (await objectExists(crop)) ? `db:${crop}` : null,
      originalOfCrop: isCoverCrop(objectPath) ? `db:${originalPathFor(objectPath)}` : undefined,
      localPath: download ? await saveLocalCopy(objectPath, body) : undefined,
      markdown: markdownImage(`db:${objectPath}`),
    });
  },
);

server.registerTool(
  "upload_image",
  {
    title: "Enviar imagem",
    description:
      "Envia uma imagem (png, jpg, webp, gif, svg ou pdf) de um arquivo local ou URL https para o bucket. " +
      "Como no painel, PNG/JPG/WebP viram WebP de até 1600 px. Um nome já usado ganha sufixo (nada é sobrescrito).",
    inputSchema: {
      filePath: z.string().optional().describe("Caminho absoluto do arquivo nesta máquina."),
      url: z.string().optional().describe("Ou: URL https da imagem."),
      folder: z.string().optional().describe(`Pasta de destino. Padrão: ${GENERAL_FOLDER}. Projetos: projects/<codigo>.`),
      fileName: z.string().optional().describe("Nome do arquivo (sem pasta). Padrão: o nome original."),
      keepFormat: z.boolean().optional().describe("true mantém PNG/JPG em vez de converter para WebP."),
      note: noteParam,
    },
    annotations: { destructiveHint: false },
  },
  async ({ filePath, url, folder = GENERAL_FOLDER, fileName, keepFormat, note }) => {
    const image = await uploadImage({ filePath, url }, folder, { fileName, keepFormat });
    await logFileEdit({ tool: "upload_image", target: image.path, note, files: [{ collection: "images", id: image.path, action: "enviado" }] });
    return reply({ ...image, url: await publicUrl(image.path), markdown: markdownImage(image.ref) });
  },
);

server.registerTool(
  "edit_image",
  {
    title: "Editar imagem",
    description:
      "Gira, espelha, recorta, redimensiona ou converte uma imagem (PNG, JPG ou WebP). Cria um arquivo novo ao lado do original. " +
      "Com replaceReferences: true, todo o site passa a usar a versão nova.",
    inputSchema: {
      ref: refParam,
      ...editOperationsShape,
      fileName: z.string().optional().describe("Nome do arquivo novo. Padrão: <nome>-editada."),
      replaceReferences: z.boolean().optional().describe("Trocar o original pelo novo em todo o conteúdo."),
      note: noteParam,
    },
    annotations: { destructiveHint: false },
  },
  async ({ ref, fileName, replaceReferences = false, note, ...operations }) => {
    const source = refToPath(ref);
    const edited = await applyEdits(await downloadObject(source), path.extname(source).toLowerCase(), operations);
    const base = slugify(fileName ? path.parse(fileName).name : `${path.parse(source).name}-editada`) || "imagem-editada";
    const target = await putObject(`${folderOf(source) || GENERAL_FOLDER}/${base}${edited.ext}`, edited.body);

    const edit: EditInfo = { tool: "edit_image", target: base, note, files: [{ collection: "images", id: target, action: "editado", from: source }] };
    let replaced = 0;
    let backupPath: string | undefined;
    let written = false;
    if (replaceReferences) {
      const outcome = await updatePortfolio(edit, (doc) => {
        const count = replaceImageRef(doc, source, target);
        return { result: count, changed: count > 0 };
      });
      replaced = outcome.result;
      backupPath = outcome.backupPath;
      written = outcome.written;
    }
    await recordFileOnly(edit, written);
    return reply({
      ref: `db:${target}`,
      width: edited.width,
      height: edited.height,
      bytes: edited.body.length,
      referencesReplaced: replaced,
      backupPath,
      localPath: await saveLocalCopy(target, edited.body),
      markdown: markdownImage(`db:${target}`),
    });
  },
);

server.registerTool(
  "crop_cover",
  {
    title: "Recortar capa 16:9",
    description:
      "Gera o recorte de capa 16:9 (1600×900, WebP) de uma imagem, igual ao enquadramento do painel, salvo como <original>.capa.webp. " +
      "Escolha o enquadramento por foco e zoom, ou por uma região exata em pixels. Depois aplique com set_image.",
    inputSchema: {
      ref: refParam,
      focusX: z.number().min(0).max(1).optional().describe("Centro horizontal do quadro, de 0 (esquerda) a 1 (direita). Padrão 0.5."),
      focusY: z.number().min(0).max(1).optional().describe("Centro vertical, de 0 (topo) a 1 (base). Padrão 0.5."),
      zoom: z.number().min(1).max(10).optional().describe("Aproximação: 1 cobre o máximo possível. Padrão 1."),
      region: regionSchema.optional().describe("Ou: região exata do original em pixels (deve ser ~16:9)."),
      note: noteParam,
    },
    annotations: { destructiveHint: false },
  },
  async ({ ref, focusX, focusY, zoom, region, note }) => {
    // Sempre a partir do original: recortar o recorte perderia qualidade a cada vez.
    const original = originalPathFor(refToPath(ref));
    const cover = await renderCover(await downloadObject(original), { region, focusX, focusY, zoom });
    const target = await putObject(coverPathFor(original), cover.body, { upsert: true });
    await logFileEdit({ tool: "crop_cover", target, note, files: [{ collection: "images", id: target, action: "recortado", from: original }] });
    return reply({
      ref: `db:${target}`,
      original: `db:${original}`,
      region: cover.region,
      source: cover.source,
      localPath: await saveLocalCopy(target, cover.body),
      next: "Use set_image com slot project.cover ou post.cover para aplicar.",
    });
  },
);

server.registerTool(
  "move_image",
  {
    title: "Mover ou renomear imagem",
    description:
      "Move uma imagem para outra pasta e/ou troca o nome, levando junto o recorte de capa e atualizando todas as referências no site.",
    inputSchema: {
      ref: refParam,
      folder: z.string().optional().describe("Pasta nova. Padrão: a atual."),
      fileName: z.string().optional().describe("Nome novo (a extensão é mantida). Padrão: o atual."),
      note: noteParam,
    },
    annotations: { destructiveHint: true },
  },
  async ({ ref, folder, fileName, note }) => {
    const from = refToPath(ref);
    if (isCoverCrop(from)) throw new Error("Mova a imagem original; o recorte de capa vai junto.");
    const ext = path.extname(from);
    const name = fileName ? `${slugify(path.parse(fileName).name) || "imagem"}${ext}` : path.basename(from);
    const destinationFolder = folder !== undefined ? refToPath(folder).replace(/\/+$/, "") : folderOf(from);
    const to = destinationFolder ? `${destinationFolder}/${name}` : name;
    if (to === from) throw new Error("O destino é igual à origem.");
    if (await objectExists(to)) throw new Error(`Já existe "${to}". Escolha outro nome.`);

    const moves: [string, string][] = [[from, to]];
    if (await objectExists(coverPathFor(from))) moves.push([coverPathFor(from), coverPathFor(to)]);

    const done: [string, string][] = [];
    try {
      for (const [a, b] of moves) {
        await moveObject(a, b);
        done.push([a, b]);
      }
      const edit: EditInfo = {
        tool: "move_image",
        target: path.parse(to).name,
        note,
        files: moves.map(([a, b]) => ({ collection: "images", id: b, action: "movido", from: a })),
      };
      const outcome = await updatePortfolio(edit, (doc) => {
        const count = moves.reduce((sum, [a, b]) => sum + replaceImageRef(doc, a, b), 0);
        return { result: count, changed: count > 0 };
      });
      await recordFileOnly(edit, outcome.written);
      return reply({ from: `db:${from}`, ref: `db:${to}`, movedFiles: moves.length, referencesUpdated: outcome.result, backupPath: outcome.backupPath });
    } catch (error) {
      // Sem o conteúdo atualizado, os arquivos voltam para onde estavam.
      for (const [a, b] of done.reverse()) await moveObject(b, a).catch(() => undefined);
      throw error;
    }
  },
);

server.registerTool(
  "delete_image",
  {
    title: "Apagar imagem",
    description:
      "Apaga uma imagem do bucket. Recusa se ela estiver em uso no site (ou se for a origem de um recorte de capa em uso), a não ser com force: true.",
    inputSchema: {
      ref: refParam,
      force: z.boolean().optional().describe("Apagar mesmo em uso (as referências ficam quebradas)."),
      note: noteParam,
    },
    annotations: { destructiveHint: true },
  },
  async ({ ref, force = false, note }) => {
    const objectPath = refToPath(ref);
    if (!(await objectExists(objectPath))) throw new Error(`"${objectPath}" não existe no Storage.`);
    const { data } = await readPortfolio();
    const usedIn = usageOf(findImageUsage(data), objectPath);
    if (usedIn.length && !force) {
      throw new Error(`A imagem está em uso e não foi apagada: ${usedIn.join("; ")}. Troque as referências antes, ou use force.`);
    }
    await removeObjects([objectPath]);
    await logFileEdit({ tool: "delete_image", target: objectPath, note, files: [{ collection: "images", id: objectPath, action: "apagado" }] });
    const crop = isCoverCrop(objectPath) ? null : coverPathFor(objectPath);
    return reply({
      deleted: `db:${objectPath}`,
      brokenReferences: usedIn,
      remainingCoverCrop: crop && (await objectExists(crop)) ? `db:${crop}` : null,
    });
  },
);

server.registerTool(
  "set_image",
  {
    title: "Colocar imagem no site",
    description:
      "Põe uma imagem num lugar do site: avatar e ícone do perfil, capa de projeto ou post, galeria de projeto, experiência ou atividade. " +
      "`ref: null` limpa capa/avatar; em galerias, `remove: true` tira a imagem.",
    inputSchema: {
      slot: z.enum(IMAGE_SLOTS).describe("Lugar da imagem."),
      slug: z.string().optional().describe("Projeto/post: código ou id. Experiência/atividade: id. Perfil: não precisa."),
      ref: refParam.nullable().describe("Imagem (`db:caminho` ou URL https); null limpa capa/avatar."),
      remove: z.boolean().optional().describe("Galerias: tirar em vez de pôr."),
      position: z.number().int().min(0).optional().describe("Galerias: posição (0 = primeira). Padrão: fim."),
      caption: z.string().optional().describe("Galeria de projeto: legenda PT."),
      captionEn: z.string().optional().describe("Galeria de projeto: legenda EN."),
      note: noteParam,
      dryRun: dryRunParam,
    },
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  async ({ dryRun = false, note, ...placement }) => {
    if (!placement.remove) await assertStored(placement.ref);
    const outcome = await updatePortfolio(
      { tool: "set_image", target: `${placement.slot}-${placement.slug ?? ""}`, note },
      (doc) => {
        const result = placeImage(doc, placement);
        return { result, changed: JSON.stringify(result.before) !== JSON.stringify(result.after) };
      },
      { dryRun },
    );
    return reply({
      status: dryRun ? "simulação — nada foi gravado" : outcome.written ? "gravado" : "sem alterações",
      ...outcome.result,
      backupPath: outcome.backupPath,
    });
  },
);

server.registerTool(
  "insert_image_in_text",
  {
    title: "Inserir imagem no texto",
    description:
      "Insere ![legenda](db:...) no Markdown de um projeto ou post: ao fim do texto, ou logo depois da linha que contém `after`. " +
      "O site exibe o texto alternativo como legenda.",
    inputSchema: {
      ref: refParam,
      target: z.enum(["project", "post"]).describe("Tipo de conteúdo."),
      slug: z.string().min(1).describe("Código ou id do projeto/post."),
      field: z
        .string()
        .optional()
        .describe("Campo de Markdown. Projeto: detailedDescription (padrão), detailedDescriptionEn, scientificRelevance... Post: content (padrão), contentEn."),
      alt: z.string().optional().describe("Legenda / texto alternativo."),
      after: z.string().optional().describe("Trecho existente (único) depois de cuja linha a imagem entra. Ex.: '## Resultados'."),
      note: noteParam,
      dryRun: dryRunParam,
    },
    annotations: { destructiveHint: false },
  },
  async ({ ref, target, slug, field, alt, after, note, dryRun = false }) => {
    const fields: readonly string[] = TEXT_TARGETS[target];
    const chosen = field ?? fields[0];
    if (!fields.includes(chosen)) throw new Error(`Campo inválido para ${target}: ${chosen}. Aceitos: ${fields.join(", ")}.`);
    const imageRef = ref.startsWith("https://") ? ref : `db:${refToPath(ref)}`;
    await assertStored(imageRef);
    const block = markdownImage(imageRef, alt);

    const outcome = await updatePortfolio(
      { tool: "insert_image_in_text", target: `${slug}-${chosen}`, note },
      (doc) => {
        const item = target === "project" ? findBySlug(doc.projects, slug) : findBySlug(doc.posts ?? [], slug);
        if (!item) throw new Error(`${target === "project" ? "Projeto" : "Post"} "${slug}" não encontrado.`);
        const record = item as unknown as Record<string, string | undefined>;
        record[chosen] = insertBlock(record[chosen], block, after);
        return { result: { location: `${target === "project" ? "projects" : "posts"}/${slug}/${chosen}`, inserted: block }, changed: true };
      },
      { dryRun },
    );
    return reply({
      status: dryRun ? "simulação — nada foi gravado" : "gravado",
      ...outcome.result,
      backupPath: outcome.backupPath,
    });
  },
);

await server.connect(new StdioServerTransport());
console.error(`portfolio-media pronto (${SITE_URL}).`);
