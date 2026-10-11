import { isDevPreview } from "./devPreview";
import { isSupabaseConfigured, supabase } from "./supabase";
import { shiftDay, todayKey, type DailyUpdate } from "./dailyUpdates";

export * from "./dailyUpdates";

/**
 * Atualizações diárias do painel (supabase/daily_updates.sql): o que um agente
 * publica para você a cada manhã, pelo servidor MCP `painel`.
 *
 * Tipos, séries e o "hoje" ficam em ./dailyUpdates, sem dependências, para o
 * servidor MCP reaproveitar sem carregar o cliente do navegador.
 */

export const DAILY_UPDATES_CHANGED_EVENT = "admin-daily-updates-changed";

export class DailyUpdatesUnavailableError extends Error {
  constructor() {
    super("A tabela de atualizações ainda não existe. Rode supabase/daily_updates.sql no SQL Editor do Supabase.");
  }
}

function sample(
  id: string,
  daysAgo: number,
  kind: string,
  title: string,
  content: string,
  done: boolean,
): DailyUpdate {
  const at = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return {
    id,
    kind,
    day: shiftDay(todayKey(), -daysAgo),
    title,
    content,
    source: "Prévia local",
    read_at: done ? at : null,
    created_at: at,
    updated_at: at,
  };
}

// Prévia local: exemplos em memória, para exercitar a caixa de entrada e o
// calendário sem tocar na nuvem. Somem ao recarregar a página.
let previewUpdates: DailyUpdate[] | null = null;
function previewList(): DailyUpdate[] {
  previewUpdates ??= [
    sample(
      "previa-agenda-1",
      0,
      "agenda",
      "Agenda do dia",
      "- **Dia inteiro** · Entrega do relatório de óptica\n" +
        "- **09:00–10:00** · Reunião do grupo de pesquisa · Google Meet\n" +
        "- **14:30–15:30** · Revisão do projeto do telescópio · Lab 2",
      false,
    ),
    sample("previa-agenda-2", 1, "agenda", "Agenda do dia", "- **10:00–11:00** · Aula de Física Moderna\n- **16:00** · Academia", true),
    sample(
      "previa-1",
      0,
      "ingles",
      "Get the hang of something",
      "**Significado:** pegar o jeito de algo.\n\n" +
        "- *It took me a week, but I finally got the hang of React hooks.*\n" +
        "- *Don't worry, you'll get the hang of it.*\n\n" +
        "> Use com *of* + substantivo ou *-ing*: *get the hang of driving*.",
      false,
    ),
    sample(
      "previa-2",
      1,
      "ingles",
      "Actually ≠ atualmente",
      "*Actually* quer dizer **na verdade**. Para **atualmente**, use *currently* ou *nowadays*.\n\n" +
        "- *I'm currently working on a telescope project.*",
      false,
    ),
    sample("previa-3", 2, "ingles", "Look forward to", "**Significado:** aguardar com expectativa.\n\n- *I'm looking forward to the weekend.*", true),
    sample("previa-4", 4, "ingles", "Make vs. do", "*Make* para criar ou produzir; *do* para tarefas e atividades.\n\n- *make a decision*, *do homework*", true),
    sample("previa-5", 9, "ingles", "Pretend ≠ pretender", "*Pretend* é **fingir**. Para **pretender**, use *intend* ou *plan to*.", true),
  ];
  return previewUpdates;
}

export async function fetchDailyUpdates(limit = 1000): Promise<DailyUpdate[]> {
  if (isDevPreview()) return previewList().map((update) => ({ ...update }));
  if (!isSupabaseConfigured) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase
    .from("admin_daily_updates")
    .select("id,kind,day,title,content,source,read_at,created_at,updated_at")
    .order("day", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") throw new DailyUpdatesUnavailableError();
    throw new Error(`Não foi possível carregar as atualizações: ${error.message}`);
  }
  return (data ?? []) as DailyUpdate[];
}

/**
 * OK na caixa de entrada: guarda as atualizações na área da série. Com
 * `done: false`, desfaz e devolve à caixa de entrada.
 */
export async function setDailyUpdatesDone(ids: string[], done: boolean): Promise<void> {
  if (!ids.length) return;
  const readAt = done ? new Date().toISOString() : null;
  if (isDevPreview()) {
    for (const update of previewList()) if (ids.includes(update.id)) update.read_at = readAt;
  } else {
    const { error } = await supabase.from("admin_daily_updates").update({ read_at: readAt }).in("id", ids);
    if (error) throw new Error(`Não foi possível ${done ? "guardar" : "devolver à caixa de entrada"}: ${error.message}`);
  }
  window.dispatchEvent(new Event(DAILY_UPDATES_CHANGED_EVENT));
}

/** Quantas estão na caixa de entrada — o número ao lado da aba. */
export async function countInboxDailyUpdates(): Promise<number> {
  if (isDevPreview()) return previewList().filter((update) => !update.read_at).length;
  if (!isSupabaseConfigured) return 0;
  const { count, error } = await supabase
    .from("admin_daily_updates")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  // Sem a tabela (SQL ainda não rodado) a aba só fica sem número.
  return error ? 0 : count ?? 0;
}
