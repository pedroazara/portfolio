import type { CoverArt, CoverPack, Project } from "../types";
import { COVER_ASPECT_CLASS } from "./coverAspect";
import { SHARE_IMAGE_SIZE } from "./siteMeta";

/**
 * Pacote de capas: uma arte desenhada para cada lugar do site, em tema claro
 * e escuro.
 *
 * A capa única (`imageUrl`) aparece em quadros diferentes — inteira no cartão
 * da lista, cortada no topo da página, com o painel do título por cima da
 * faixa de baixo — e a mesma imagem clara no tema escuro. O pacote resolve
 * desenhando cada quadro de propósito. Estas medidas são o contrato entre a
 * skill que desenha (mcp/skills/portfolio-capas), a ferramenta que valida e
 * envia (apply_cover_pack) e os componentes que exibem.
 */

export type CoverSlot = "card" | "cardMobile" | "hero" | "square";

export interface CoverSlotSpec {
  /** Prefixo do arquivo no pacote: `card-mobile-light.svg`. */
  file: string;
  width: number;
  height: number;
  /** Onde a arte aparece, para mensagens e documentação. */
  where: string;
}

export const COVER_SLOTS: Record<CoverSlot, CoverSlotSpec> = {
  card: { file: "card", width: 1600, height: 900, where: "cartões da lista de projetos e dos destaques, slides do pitch" },
  cardMobile: { file: "card-mobile", width: 1200, height: 900, where: "cartões no celular (telas com menos de 640 px)" },
  hero: { file: "hero", width: 1600, height: 900, where: "topo da página do projeto; os 20% de baixo ficam sob o painel do título" },
  square: { file: "square", width: 1200, height: 1200, where: "miniaturas quadradas (painel Meu espaço)" },
};

/**
 * Prévia do link ao compartilhar (Open Graph). Sai sempre em JPEG de até
 * 300 kB: as redes não leem SVG e o WhatsApp ignora prévias maiores.
 */
export const COVER_OG = { file: "og", ...SHARE_IMAGE_SIZE, maxBytes: 300 * 1024 } as const;

/** Largura abaixo da qual o cartão usa a arte 4:3 — o `sm` do Tailwind. */
export const COVER_MOBILE_MAX_WIDTH = 639.98;

/**
 * A arte de cada lugar, com as substituições quando o pacote não traz uma:
 * o topo da página e a miniatura caem no cartão, que é a única obrigatória.
 */
export function pickCoverArt(pack: CoverPack | undefined, slot: CoverSlot): CoverArt | undefined {
  if (!pack) return undefined;
  if (slot === "hero") return pack.hero ?? pack.card;
  if (slot === "square") return pack.square ?? pack.card;
  return pack[slot];
}

/**
 * Proporção do quadro do cartão: 4:3 no celular quando o pacote tem essa arte,
 * 16:9 nos demais casos. As classes ficam escritas por inteiro para o Tailwind
 * encontrá-las.
 */
export function cardFrameClass(project: Pick<Project, "coverPack">): string {
  return project.coverPack?.card && project.coverPack.cardMobile ? "aspect-[4/3] sm:aspect-video" : COVER_ASPECT_CLASS;
}

/** Imagem da prévia do link: a do pacote, ou a capa quando ela serve (SVG não serve). */
export function socialImageOf(item: { coverPack?: CoverPack; imageUrl?: string }): string | undefined {
  if (item.coverPack?.og) return item.coverPack.og;
  return item.imageUrl && !isSvgRef(item.imageUrl) ? item.imageUrl : undefined;
}

export function isSvgRef(ref: string): boolean {
  return /\.svg(?:$|[?#])/i.test(ref) || ref.startsWith("data:image/svg");
}
