import type { ResumeData } from "../types";
import { scopedKey } from "./localWorkspace";

/**
 * Edições que ainda não chegaram à nuvem.
 *
 * A cópia local principal (`workspaceKey`) é sobrescrita pela versão da nuvem a
 * cada carregamento. Se uma gravação falhou — outra aba ou um agente gravou
 * antes, ou a rede caiu —, recarregar apagaria o que foi digitado. Por isso,
 * enquanto houver edição não sincronizada, guardamos à parte o documento que a
 * aba leu (`base`) e o que ela tem agora (`mine`). Depois de recarregar,
 * `mergeEdits` reaplica só o que a pessoa mudou sobre a versão nova da nuvem.
 */
export interface PendingEdits {
  /** Aba que gravou a cópia: só ela a apaga ao sincronizar. */
  tab: string;
  at: string;
  base: ResumeData;
  mine: ResumeData;
}

const key = () => scopedKey("pending-edits");

/** Recebe os documentos já serializados: roda a cada tecla, sem serializar de novo. */
export function savePendingEdits(tab: string, baseJson: string, mineJson: string) {
  const at = new Date().toISOString();
  localStorage.setItem(key(), `{"tab":${JSON.stringify(tab)},"at":"${at}","base":${baseJson},"mine":${mineJson}}`);
}

export function readPendingEdits(): PendingEdits | null {
  try {
    const raw = localStorage.getItem(key());
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry?.base && entry?.mine ? entry : null;
  } catch {
    return null;
  }
}

/**
 * Apaga a cópia. Com `tab` e `syncedJson`, só apaga se ela for dessa aba e
 * guardar exatamente o que acabou de ser gravado — se a pessoa digitou mais
 * durante a gravação, a cópia continua valendo.
 */
export function clearPendingEdits(only?: { tab: string; syncedJson: string }) {
  if (only) {
    const entry = readPendingEdits();
    if (!entry || entry.tab !== only.tab || JSON.stringify(entry.mine) !== only.syncedJson) return;
  }
  localStorage.removeItem(key());
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isIdList = (v: unknown): v is { id: string }[] =>
  Array.isArray(v) && v.every((item) => isRecord(item) && typeof item.id === "string");

/**
 * Junção em três vias: o que mudou de `base` para `mine` entra em `current`, e
 * o resto de `current` (o que outra aba ou um agente gravou) fica. Objetos se
 * juntam campo a campo e listas com `id` (projetos, posts...) item a item.
 * Quando os dois lados mudaram o mesmo valor, vale `mine`, a não ser que
 * `mine` tenha apagado um item que o outro lado editou: aí o item fica.
 */
export function mergeEdits<T>(base: T, current: T, mine: T): T {
  if (same(mine, base)) return current;
  if (same(current, base)) return mine;
  if (mine === undefined) return current;
  if (isRecord(base) && isRecord(current) && isRecord(mine)) {
    const out: Record<string, unknown> = { ...current };
    for (const k of new Set([...Object.keys(base), ...Object.keys(current), ...Object.keys(mine)])) {
      const value = mergeEdits(base[k], current[k], mine[k]);
      if (value === undefined) delete out[k];
      else out[k] = value;
    }
    return out as T;
  }
  if (isIdList(base) && isIdList(current) && isIdList(mine)) {
    const find = (list: { id: string }[], id: string) => list.find((item) => item.id === id);
    const ids = (list: { id: string }[]) => list.map((item) => item.id);
    // Se `mine` reordenou a lista, a ordem dela vale; senão, a de `current`.
    const [first, second] = same(ids(mine), ids(base)) ? [current, mine] : [mine, current];
    const order = [...new Set([...ids(first), ...ids(second)])];
    return order
      .map((id) => mergeEdits(find(base, id), find(current, id), find(mine, id)))
      .filter((item) => item !== undefined) as T;
  }
  return mine;
}

const SECTION_LABELS: Record<string, string> = {
  profile: "Perfil",
  categories: "Categoria",
  projects: "Projeto",
  experiences: "Experiência",
  academicActivities: "Atividade acadêmica",
  educations: "Formação",
  skills: "Habilidade",
  skillCategories: "Categoria de habilidade",
  courses: "Curso",
  posts: "Post",
};

const nameOf = (item: Record<string, unknown>) =>
  [item.title, item.name, item.institution, item.id].find((v) => typeof v === "string" && v.trim()) as string;

/** O que `mine` mudou em relação a `base`, em linhas legíveis ("Post "Título""). */
export function describeEdits(base: ResumeData, mine: ResumeData): string[] {
  const b = base as unknown as Record<string, unknown>;
  const m = mine as unknown as Record<string, unknown>;
  return [...new Set([...Object.keys(b), ...Object.keys(m)])].flatMap((section) => {
    if (same(b[section], m[section])) return [];
    const label = SECTION_LABELS[section] ?? section;
    const before = b[section] ?? [];
    const after = m[section] ?? [];
    if (!isIdList(before) || !isIdList(after)) return [label];
    const all = new Map([...before, ...after].map((item) => [item.id, item]));
    const items = [...all.keys()].filter(
      (id) => !same(before.find((item) => item.id === id), after.find((item) => item.id === id)),
    );
    return items.length ? items.map((id) => `${label} "${nameOf(all.get(id) as Record<string, unknown>)}"`) : [label];
  });
}
