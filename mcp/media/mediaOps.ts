import sharp from "sharp";
import { z } from "zod";
import type { ResumeData } from "../../src/types";
import { findBySlug, slugOf } from "../../src/utils/slug";
import { TEXT_FIELDS as PROJECT_TEXT_FIELDS } from "../projects/projectOps";

/**
 * Regras da mídia sem rede: enquadramento de capa, edição de pixels e onde uma
 * imagem pode ser colocada no documento. O servidor só baixa, chama e grava.
 */

/** Mesmo enquadramento do painel (src/lib/coverAspect.ts). */
export const COVER_ASPECT = 16 / 9;
export const COVER_OUTPUT_WIDTH = 1600;
const COVER_QUALITY = 85;

export const regionSchema = z.object({
  left: z.number().int().min(0),
  top: z.number().int().min(0),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
});
export type Region = z.infer<typeof regionSchema>;

/**
 * Região 16:9 da imagem original, como o quadro do painel calcula: no zoom 1
 * o quadro cobre a imagem pelo lado mais curto; `focusX`/`focusY` (0 a 1)
 * escolhem o centro e o zoom aproxima.
 */
export function coverRegion(width: number, height: number, { focusX = 0.5, focusY = 0.5, zoom = 1 } = {}): Region {
  const baseWidth = width / height > COVER_ASPECT ? height * COVER_ASPECT : width;
  const cropWidth = Math.min(width, Math.max(1, Math.round(baseWidth / Math.max(zoom, 1))));
  const cropHeight = Math.min(height, Math.max(1, Math.round(cropWidth / COVER_ASPECT)));
  const clamp = (value: number, max: number) => Math.min(Math.max(Math.round(value), 0), max);
  return {
    left: clamp(focusX * width - cropWidth / 2, width - cropWidth),
    top: clamp(focusY * height - cropHeight / 2, height - cropHeight),
    width: cropWidth,
    height: cropHeight,
  };
}

function assertInside(region: Region, width: number, height: number) {
  if (region.left + region.width > width || region.top + region.height > height) {
    throw new Error(`A região passa da imagem (${width}×${height} px).`);
  }
}

export async function renderCover(body: Buffer, options: { region?: Region; focusX?: number; focusY?: number; zoom?: number }) {
  const oriented = await sharp(body).autoOrient().toBuffer();
  const { width = 0, height = 0 } = await sharp(oriented).metadata();
  const region = options.region ?? coverRegion(width, height, options);
  assertInside(region, width, height);
  const output = await sharp(oriented)
    .extract(region)
    .resize(COVER_OUTPUT_WIDTH, Math.round(COVER_OUTPUT_WIDTH / COVER_ASPECT), { fit: "cover" })
    .webp({ quality: COVER_QUALITY })
    .toBuffer();
  return { body: output, region, source: { width, height } };
}

export const editOperationsShape = {
  rotate: z.number().optional().describe("Graus no sentido horário (ex.: 90, 180, 270)."),
  flipHorizontal: z.boolean().optional().describe("Espelha da esquerda para a direita."),
  flipVertical: z.boolean().optional().describe("Espelha de cima para baixo."),
  crop: regionSchema.optional().describe("Recorte em pixels, medido depois da rotação: { left, top, width, height }."),
  resize: z
    .object({ width: z.number().int().min(1).optional(), height: z.number().int().min(1).optional() })
    .optional()
    .describe("Tamanho máximo; mantém a proporção e nunca amplia."),
  format: z.enum(["webp", "png", "jpg"]).optional().describe("Formato de saída. Padrão: o atual."),
  quality: z.number().int().min(1).max(100).optional().describe("Qualidade de WebP/JPG (padrão 80)."),
};
const editOperationsSchema = z.object(editOperationsShape);
export type EditOperations = z.infer<typeof editOperationsSchema>;

/** Aplica as operações na ordem: orientação, rotação, espelhos, recorte, tamanho, formato. */
export async function applyEdits(body: Buffer, currentExt: string, operations: EditOperations) {
  const ops = editOperationsSchema.parse(operations);
  if (![".png", ".jpg", ".jpeg", ".webp"].includes(currentExt)) {
    throw new Error("Só PNG, JPG e WebP podem ser editados (GIF perderia a animação; SVG e PDF não são pixels).");
  }
  let pipeline = sharp(body).autoOrient();
  if (ops.rotate) pipeline = pipeline.rotate(ops.rotate);
  if (ops.flipVertical) pipeline = pipeline.flip();
  if (ops.flipHorizontal) pipeline = pipeline.flop();
  let image = await pipeline.toBuffer();

  if (ops.crop) {
    const { width = 0, height = 0 } = await sharp(image).metadata();
    assertInside(ops.crop, width, height);
    image = await sharp(image).extract(ops.crop).toBuffer();
  }
  let output = sharp(image);
  if (ops.resize && (ops.resize.width || ops.resize.height)) {
    output = output.resize({ ...ops.resize, fit: "inside", withoutEnlargement: true });
  }
  const format = ops.format ?? ({ ".png": "png", ".webp": "webp" }[currentExt] || "jpg");
  const quality = ops.quality ?? 80;
  if (format === "webp") output = output.webp({ quality });
  else if (format === "png") output = output.png();
  else output = output.jpeg({ quality, mozjpeg: true });

  const result = await output.toBuffer({ resolveWithObject: true });
  return { body: result.data, ext: `.${format}`, width: result.info.width, height: result.info.height };
}

/** Lugares do site que recebem uma imagem fora do texto. */
export const IMAGE_SLOTS = [
  "profile.avatar",
  "profile.badge",
  "project.cover",
  "project.gallery",
  "post.cover",
  "experience.gallery",
  "activity.gallery",
] as const;
export type ImageSlot = (typeof IMAGE_SLOTS)[number];

export interface Placement {
  slot: ImageSlot;
  /** Projeto/post: código ou id. Experiência/atividade: id. */
  slug?: string;
  /** `null` limpa uma capa ou avatar. */
  ref: string | null;
  /** Galerias: tira a imagem em vez de pôr. */
  remove?: boolean;
  /** Galerias: posição (0 = primeira). Padrão: fim. */
  position?: number;
  caption?: string;
  captionEn?: string;
}

type AnyRecord = Record<string, any>;

function findItem(list: AnyRecord[] | undefined, slug: string | undefined, kind: string, bySlug: boolean): AnyRecord {
  if (!slug) throw new Error(`Informe \`slug\` (${kind}).`);
  const items = list ?? [];
  const found = bySlug ? findBySlug(items as { id: string }[], slug) : items.find((item) => item.id === slug);
  if (!found) {
    const known = items.map((item) => (bySlug ? slugOf(item as { id: string }) : item.id)).join(", ");
    throw new Error(`${kind} "${slug}" não encontrado. Existentes: ${known || "nenhum"}.`);
  }
  return found as AnyRecord;
}

/**
 * Põe (ou tira) a imagem no lugar pedido. Altera `doc` e devolve o rótulo do
 * lugar e os valores antes/depois.
 */
export function placeImage(doc: ResumeData, placement: Placement) {
  const { slot, slug, ref } = placement;
  if (ref !== null && !ref.startsWith("db:") && !/^https:\/\//i.test(ref)) {
    throw new Error(`Imagem inválida: "${ref}". Use \`db:caminho\` ou uma URL https.`);
  }

  const single = (target: AnyRecord, field: string, location: string) => {
    const before = target[field] ?? null;
    if (ref === null) delete target[field];
    else target[field] = ref;
    return { location, before, after: ref };
  };

  const gallery = (target: AnyRecord, location: string, withCaptions: boolean) => {
    if (ref === null) throw new Error("Galerias precisam de `ref`.");
    const before: string[] = [...(target.galleryImages ?? [])];
    const without = before.filter((item) => item !== ref);
    let after = without;
    if (!placement.remove) {
      const at = Math.min(Math.max(placement.position ?? without.length, 0), without.length);
      after = [...without.slice(0, at), ref, ...without.slice(at)];
    }
    target.galleryImages = after;
    if (withCaptions) {
      for (const [field, text] of [["galleryCaptions", placement.caption], ["galleryCaptionsEn", placement.captionEn]] as const) {
        const captions = { ...(target[field] ?? {}) };
        if (placement.remove) delete captions[ref];
        else if (text !== undefined) captions[ref] = text;
        if (Object.keys(captions).length) target[field] = captions;
        else delete target[field];
      }
    }
    return { location, before, after };
  };

  switch (slot) {
    case "profile.avatar":
      return single(doc.profile as AnyRecord, "avatarUrl", "profile/avatarUrl");
    case "profile.badge":
      return single(doc.profile as AnyRecord, "badgeIconUrl", "profile/badgeIconUrl");
    case "project.cover": {
      const project = findItem(doc.projects, slug, "Projeto", true);
      return single(project, "imageUrl", `projects/${slugOf(project as { id: string })}/imageUrl`);
    }
    case "project.gallery": {
      const project = findItem(doc.projects, slug, "Projeto", true);
      return gallery(project, `projects/${slugOf(project as { id: string })}/galleryImages`, true);
    }
    case "post.cover": {
      const post = findItem(doc.posts, slug, "Post", true);
      return single(post, "imageUrl", `posts/${slugOf(post as { id: string })}/imageUrl`);
    }
    case "experience.gallery": {
      const experience = findItem(doc.experiences, slug, "Experiência", false);
      return gallery(experience, `experiences/${experience.id}/galleryImages`, false);
    }
    case "activity.gallery": {
      const activity = findItem(doc.academicActivities, slug, "Atividade", false);
      return gallery(activity, `academicActivities/${activity.id}/galleryImages`, false);
    }
  }
}

/** Campos de Markdown que aceitam imagens, por tipo de conteúdo. */
export const TEXT_TARGETS = {
  project: PROJECT_TEXT_FIELDS,
  post: ["content", "contentEn"],
} as const;

/** `![legenda](db:...)` — o site mostra o texto alternativo como legenda. */
export function markdownImage(ref: string, alt = ""): string {
  return `![${alt.replace(/[[\]]/g, "")}](${ref})`;
}

/**
 * Insere um bloco de imagem no Markdown: ao fim, ou logo depois da linha que
 * contém `after` (que precisa aparecer uma única vez).
 */
export function insertBlock(text: string | undefined, block: string, after?: string): string {
  const body = text ?? "";
  if (!after) return body.trim() ? `${body.replace(/\s+$/, "")}\n\n${block}` : block;
  const count = body.split(after).length - 1;
  if (count === 0) throw new Error("Trecho `after` não encontrado. Copie-o exatamente do texto atual.");
  if (count > 1) throw new Error(`O trecho \`after\` aparece ${count} vezes. Inclua mais contexto para ele ser único.`);
  const end = body.indexOf(after) + after.length;
  const lineEnd = body.indexOf("\n", end) === -1 ? body.length : body.indexOf("\n", end);
  const rest = body.slice(lineEnd).replace(/^\n+/, "");
  return `${body.slice(0, lineEnd)}\n\n${block}${rest ? `\n\n${rest}` : ""}`;
}
