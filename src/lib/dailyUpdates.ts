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
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DAILY_UPDATE_KINDS: Record<string, { label: string; description: string }> = {
  ingles: { label: "Inglês", description: "Uma expressão, palavra ou ponto de gramática por dia." },
  alemao: { label: "Alemão", description: "Mini-aula do dia; as palavras dela entram no baralho da aba Idiomas." },
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
