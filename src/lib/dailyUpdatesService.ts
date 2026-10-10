import { isDevPreview } from "./devPreview";
import { isSupabaseConfigured, supabase } from "./supabase";
import { todayKey, type DailyUpdate } from "./dailyUpdates";

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

function sampleUpdates(): DailyUpdate[] {
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 86_400_000));
  const at = new Date().toISOString();
  return [
    {
      id: "previa-1",
      kind: "ingles",
      day: today,
      title: "Get the hang of something",
      content:
        "**Significado:** pegar o jeito de algo.\n\n" +
        "- *It took me a week, but I finally got the hang of React hooks.*\n" +
        "- *Don't worry, you'll get the hang of it.*\n\n" +
        "> Use com *of* + substantivo ou *-ing*: *get the hang of driving*.",
      source: "Prévia local",
      read_at: null,
      created_at: at,
      updated_at: at,
    },
    {
      id: "previa-2",
      kind: "ingles",
      day: yesterday,
      title: "Actually ≠ atualmente",
      content:
        "*Actually* quer dizer **na verdade**. Para **atualmente**, use *currently* ou *nowadays*.\n\n" +
        "- *I'm currently working on a telescope project.*",
      source: "Prévia local",
      read_at: at,
      created_at: at,
      updated_at: at,
    },
  ];
}

export async function fetchDailyUpdates(limit = 120): Promise<DailyUpdate[]> {
  if (isDevPreview()) return sampleUpdates();
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

/** Marca como lidas. No modo de prévia não grava nada. */
export async function markDailyUpdatesRead(ids: string[]): Promise<void> {
  if (!ids.length || isDevPreview()) return;
  const { error } = await supabase
    .from("admin_daily_updates")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .is("read_at", null);
  if (error) throw new Error(`Não foi possível marcar como lida: ${error.message}`);
  window.dispatchEvent(new Event(DAILY_UPDATES_CHANGED_EVENT));
}

/** Quantas não lidas — o número ao lado da aba. */
export async function countUnreadDailyUpdates(): Promise<number> {
  if (isDevPreview()) return sampleUpdates().filter((update) => !update.read_at).length;
  if (!isSupabaseConfigured) return 0;
  const { count, error } = await supabase
    .from("admin_daily_updates")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  // Sem a tabela (SQL ainda não rodado) a aba só fica sem número.
  return error ? 0 : count ?? 0;
}
