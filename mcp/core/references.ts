import type { ResumeData } from "../../src/types";

/**
 * Referências `db:<caminho>` espalhadas pelo documento do portfólio: capas,
 * galerias, avatar, legendas (chaveadas pela própria referência) e imagens
 * dentro do Markdown — `![legenda](db:projects/x/a.webp)`.
 *
 * Saber onde cada imagem aparece é o que permite mover, substituir ou apagar
 * um arquivo sem deixar buraco no site.
 */

/** Caracteres que podem fazer parte de um caminho citado no meio de um texto. */
const PATH_CHAR = String.raw`[^\s"'()<>\[\]\\]`;
const REF_IN_TEXT = new RegExp(`db:(${PATH_CHAR}+)`, "g");

type Visitor = (value: string, location: string, isKey: boolean) => string;

/** Rótulo legível do lugar: `projects/yolocraft/galleryImages`. */
function itemLabel(item: unknown, index: number): string {
  if (item && typeof item === "object") {
    const record = item as { codigo?: unknown; id?: unknown };
    if (typeof record.codigo === "string" && record.codigo) return record.codigo;
    if (typeof record.id === "string" && record.id) return record.id;
  }
  return String(index);
}

function mapStrings(node: unknown, trail: string[], visit: Visitor): unknown {
  if (typeof node === "string") return visit(node, trail.join("/"), false);
  if (Array.isArray(node)) {
    return node.map((item, i) => {
      // Índices de listas simples (galerias, tags) não ajudam a achar o lugar.
      const isRecord = item !== null && typeof item === "object";
      return mapStrings(item, isRecord ? [...trail, itemLabel(item, i)] : trail, visit);
    });
  }
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      out[visit(key, [...trail, key].join("/"), true)] = mapStrings(value, [...trail, key], visit);
    }
    return out;
  }
  return node;
}

/** Uma string que é só a referência (campo de capa, item de galeria). */
function wholeRef(value: string): string | null {
  return value.startsWith("db:") && !value.includes("\n") && !value.includes("](") ? value.slice(3) : null;
}

/** Caminho do bucket → lugares do documento onde ele aparece. */
export function findImageUsage(doc: ResumeData): Map<string, string[]> {
  const usage = new Map<string, Set<string>>();
  const add = (objectPath: string, location: string) => {
    if (!usage.has(objectPath)) usage.set(objectPath, new Set());
    usage.get(objectPath)!.add(location);
  };
  mapStrings(doc, [], (value, location, isKey) => {
    if (isKey) return value; // legendas repetem a referência da galeria
    const whole = wholeRef(value);
    if (whole) add(whole, location);
    else for (const match of value.matchAll(REF_IN_TEXT)) add(match[1], location);
    return value;
  });
  return new Map([...usage].map(([p, locations]) => [p, [...locations]]));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Troca todas as referências a `from` por `to`, inclusive chaves de legendas e
 * imagens no Markdown. Altera `doc` e devolve quantas trocas fez. Não confunde
 * `a.png` com `a.png.capa.webp`: o caminho precisa terminar onde a citação termina.
 */
export function replaceImageRef(doc: ResumeData, from: string, to: string): number {
  let count = 0;
  const pattern = new RegExp(`db:${escapeRegExp(from)}(?!${PATH_CHAR})`, "g");
  const next = mapStrings(doc, [], (value) => {
    if (value === `db:${from}`) {
      count++;
      return `db:${to}`;
    }
    return value.replace(pattern, () => {
      count++;
      return `db:${to}`;
    });
  }) as ResumeData;
  Object.assign(doc, next);
  return count;
}
