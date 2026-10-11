import { todayKey } from "../../src/lib/dailyUpdates";
import { cardKey } from "../../src/lib/languageCards";

/**
 * Regras do servidor "painel", sem rede: validação do que um agente publica
 * nas abas Atualizações e Idiomas.
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

export interface NewLanguageCard {
  front: string;
  back: string;
  example?: string;
  notes?: string;
}

/**
 * Limpa os cartões que um agente quer acrescentar ao baralho: tira espaços,
 * descarta os sem frente e os repetidos entre si ou já presentes (`existing`,
 * comparados sem diferenciar maiúsculas).
 */
export function prepareLanguageCards(
  cards: NewLanguageCard[],
  existing: Iterable<string>,
): { fresh: { front: string; back: string; example: string | null; notes: string | null }[]; skipped: string[] } {
  const seen = new Set([...existing].map(cardKey));
  const fresh: { front: string; back: string; example: string | null; notes: string | null }[] = [];
  const skipped: string[] = [];
  for (const card of cards) {
    const front = card.front.trim().replace(/\s+/g, " ");
    if (!front) continue;
    const key = cardKey(front);
    if (seen.has(key)) {
      skipped.push(front);
      continue;
    }
    seen.add(key);
    fresh.push({ front, back: card.back.trim(), example: card.example?.trim() || null, notes: card.notes?.trim() || null });
  }
  return { fresh, skipped };
}
