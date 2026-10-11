/**
 * Idiomas: o que é comum ao painel e ao servidor MCP `painel`.
 * Sem dependências do navegador nem do Supabase.
 *
 * Os cartões seguem uma revisão espaçada simples, no espírito do Anki (SM-2):
 * cada resposta ("Errei", "Difícil", "Fácil") decide em quantos dias o cartão
 * volta. Errar traz o cartão de volta na mesma sessão e reduz a facilidade;
 * acertar afasta a próxima revisão cada vez mais.
 */

export { todayKey } from "./dailyUpdates";

export interface LanguageCard {
  id: string;
  lang: string;
  /** No idioma estudado. Substantivos alemães vêm com o artigo: "der Tisch". */
  front: string;
  /** Em português. */
  back: string;
  example: string | null;
  notes: string | null;
  source: string | null;
  /** Próxima revisão, `AAAA-MM-DD`. */
  due_on: string;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
  last_reviewed_at: string | null;
  created_at: string;
}

export interface LanguageDay {
  lang: string;
  day: string;
  reviewed: number;
  duolingo: boolean;
}

export type ReviewGrade = "again" | "hard" | "easy";

export type CardSchedule = Pick<LanguageCard, "due_on" | "interval_days" | "ease" | "reps" | "lapses">;

export const LANGUAGES: Record<string, { label: string; speech: string; flag: string }> = {
  de: { label: "Alemão", speech: "de-DE", flag: "🇩🇪" },
};

export const MIN_EASE = 1.3;

/** Soma dias a uma data `AAAA-MM-DD`, sem passar por fuso. */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

/** A agenda do cartão depois de uma resposta, revisado no dia `today`. */
export function scheduleReview(card: CardSchedule, grade: ReviewGrade, today: string): CardSchedule {
  if (grade === "again") {
    return {
      due_on: today,
      interval_days: 0,
      ease: Math.max(MIN_EASE, round2(card.ease - 0.2)),
      reps: 0,
      lapses: card.lapses + 1,
    };
  }
  const ease = grade === "hard" ? Math.max(MIN_EASE, round2(card.ease - 0.15)) : card.ease;
  let interval: number;
  if (grade === "hard") {
    interval = Math.max(1, Math.round(card.interval_days * 1.2));
  } else if (card.reps === 0) {
    interval = 1;
  } else if (card.reps === 1) {
    interval = 3;
  } else {
    interval = Math.max(card.interval_days + 1, Math.round(card.interval_days * ease));
  }
  return { due_on: addDays(today, interval), interval_days: interval, ease, reps: card.reps + 1, lapses: card.lapses };
}

/** Quantos dias até a próxima revisão, para mostrar no botão. */
export function previewInterval(card: CardSchedule, grade: ReviewGrade): string {
  if (grade === "again") return "agora";
  const days = scheduleReview(card, grade, "2000-01-01").interval_days;
  if (days < 30) return days === 1 ? "1 dia" : `${days} dias`;
  const months = Math.round(days / 30);
  return months === 1 ? "1 mês" : `${months} meses`;
}

/** Cartões para revisar hoje: os vencidos, os mais atrasados primeiro. */
export function dueCards(cards: LanguageCard[], today: string): LanguageCard[] {
  return cards
    .filter((card) => card.due_on <= today)
    .sort((a, b) => a.due_on.localeCompare(b.due_on) || a.created_at.localeCompare(b.created_at));
}

/**
 * Dias seguidos de estudo (revisou algum cartão ou fez o Duolingo), terminando
 * hoje — ou ontem, enquanto hoje ainda não foi feito, para a sequência não
 * zerar logo de manhã.
 */
export function studyStreak(days: LanguageDay[], today: string): number {
  const studied = new Set(days.filter((day) => day.reviewed > 0 || day.duolingo).map((day) => day.day));
  let cursor = studied.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (studied.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Normaliza o texto da frente para comparar cartões repetidos. */
export function cardKey(front: string): string {
  return front.trim().replace(/\s+/g, " ").toLowerCase();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
