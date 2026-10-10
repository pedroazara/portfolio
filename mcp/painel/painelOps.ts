import { todayKey } from "../../src/lib/dailyUpdates";

/**
 * Regras do servidor "painel", sem rede: validação do que um agente publica
 * na aba Atualizações.
 */

export const KIND_PATTERN = /^[a-z][a-z0-9-]{1,39}$/;

/** Dia da atualização: o informado (`AAAA-MM-DD`) ou hoje em São Paulo. */
export function resolveDay(day: string | undefined, now = new Date()): string {
  if (!day) return todayKey(now);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  const date = match ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])) : null;
  if (!match || !date || date.toISOString().slice(0, 10) !== day.trim()) {
    throw new Error(`Dia inválido: "${day}". Use AAAA-MM-DD.`);
  }
  return day.trim();
}

export function normalizeKind(kind: string): string {
  const value = kind
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!KIND_PATTERN.test(value)) throw new Error(`Série inválida: "${kind}". Use letras minúsculas, como "ingles".`);
  return value;
}
