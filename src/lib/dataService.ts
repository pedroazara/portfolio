import { ResumeData } from "../types";
import {
  supabase,
  isSupabaseConfigured,
  PORTFOLIO_TABLE,
  PORTFOLIO_ROW_ID,
} from "./supabase";

/**
 * Erro emitido quando a linha na nuvem mudou depois da última leitura desta
 * aba. Gravar por cima descartaria a alteração de quem salvou antes.
 */
export class StaleWriteError extends Error {
  readonly stale = true;
  constructor() {
    super("A versão na nuvem é mais nova que a desta aba.");
    this.name = "StaleWriteError";
  }
}

export interface FetchResult {
  data: ResumeData | null;
  /**
   * Carimbo da versão lida. Devolvido em `saveResumeData` para detectar que
   * outra aba gravou nesse meio-tempo. `null` quando a linha ainda não existe.
   */
  version: string | null;
}

/**
 * Busca os dados do currículo/portfólio no Supabase.
 *
 * Retorna `data: null` quando a linha ainda não existe (primeiro acesso) ou
 * quando o Supabase não está configurado — nos dois casos a aplicação cai para
 * a cópia local. Erros reais de rede/permissão são lançados, para que a
 * interface distinga "ainda não há nada" de "não consegui ler".
 */
export async function fetchResumeData(): Promise<FetchResult> {
  if (!isSupabaseConfigured) return { data: null, version: null };

  const { data, error } = await supabase
    .from(PORTFOLIO_TABLE)
    .select("data,updated_at")
    .eq("id", PORTFOLIO_ROW_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { data: null, version: null };

  return {
    data: (data.data as ResumeData) ?? null,
    version: (data.updated_at as string) ?? null,
  };
}

/**
 * Grava todo o currículo/portfólio no Supabase.
 *
 * O documento é gravado inteiro, então duas abas editando ao mesmo tempo se
 * sobrescreveriam: a última a salvar apagaria o trabalho da outra. Para evitar
 * isso, a gravação é condicional — só acontece se `updated_at` na nuvem ainda
 * for o que esta aba leu (`expectedVersion`). Se outra aba tiver gravado no
 * meio-tempo, nada é escrito e um `StaleWriteError` é lançado.
 *
 * Passe `expectedVersion: null` quando a linha ainda não existir (primeira
 * gravação) — aí o insert é incondicional.
 *
 * Devolve o novo carimbo, que o chamador deve guardar para a próxima gravação.
 */
export async function saveResumeData(
  data: ResumeData,
  expectedVersion: string | null
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível salvar na nuvem.");
  }

  const nextVersion = new Date().toISOString();

  // Primeira gravação: a linha ainda não existe, não há versão a conferir.
  if (expectedVersion === null) {
    const { error } = await supabase
      .from(PORTFOLIO_TABLE)
      .upsert(
        { id: PORTFOLIO_ROW_ID, data, updated_at: nextVersion },
        { onConflict: "id" }
      );
    if (error) throw error;
    return nextVersion;
  }

  // Update condicional: o filtro por `updated_at` faz o Postgres não casar
  // nenhuma linha se outra aba já tiver gravado.
  const { data: updated, error } = await supabase
    .from(PORTFOLIO_TABLE)
    .update({ data, updated_at: nextVersion })
    .eq("id", PORTFOLIO_ROW_ID)
    .eq("updated_at", expectedVersion)
    .select("updated_at");

  if (error) throw error;
  if (!updated || updated.length === 0) throw new StaleWriteError();

  return nextVersion;
}
