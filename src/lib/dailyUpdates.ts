/**
 * Atualizações diárias: o que é comum ao painel e ao servidor MCP `painel`.
 * Sem dependências do navegador nem do Supabase.
 *
 * Cada série tem um `kind`. A primeira é a dica de inglês; uma série nova só
 * precisa de uma entrada em DAILY_UPDATE_KINDS para ganhar nome — séries
 * desconhecidas aparecem com o próprio `kind` como nome.
 */

export interface DailyUpdate {
  id: string;
  kind: string;
  /** Dia a que a atualização se refere, `AAAA-MM-DD`. */
  day: string;
  title: string;
  /** Markdown. */
  content: string;
  source: string | null;
  /**
   * Quando você deu OK. Sem valor, a atualização está na caixa de entrada;
   * com valor, foi guardada na área da série (ex.: Inglês).
   */
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DAILY_UPDATE_KINDS: Record<string, { label: string; description: string }> = {
  agenda: { label: "Agenda", description: "Seus compromissos do dia, tirados do Google Agenda." },
  ingles: { label: "Inglês", description: "Uma expressão, palavra ou ponto de gramática por dia." },
};

export function kindLabel(kind: string): string {
  return DAILY_UPDATE_KINDS[kind]?.label ?? kind;
}

/** `AAAA-MM-DD` no fuso de São Paulo — o "hoje" de quem lê o painel. */
export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Soma `amount` dias a uma data `AAAA-MM-DD`. */
export function shiftDay(day: string, amount: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + amount)).toISOString().slice(0, 10);
}

/**
 * Semanas de um mês para o calendário, de domingo a sábado, como no Google
 * Agenda em português. Dias de fora do mês completam a primeira e a última
 * semana. `month` vai de 1 a 12.
 */
export function monthGrid(year: number, month: number): { day: string; inMonth: boolean }[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = shiftDay(first.toISOString().slice(0, 10), -first.getUTCDay());
  const weeks: { day: string; inMonth: boolean }[][] = [];
  let cursor = start;
  do {
    const week = Array.from({ length: 7 }, (_, index) => {
      const day = shiftDay(cursor, index);
      return { day, inMonth: Number(day.slice(5, 7)) === month };
    });
    weeks.push(week);
    cursor = shiftDay(cursor, 7);
  } while (Number(cursor.slice(5, 7)) === month && Number(cursor.slice(0, 4)) === year);
  return weeks;
}
