import { ResumeData } from "../types";
import { supabase, isSupabaseConfigured } from "./supabase";

/** Nome da tabela de histórico de backups do portfólio. */
export const BACKUPS_TABLE = "portfolio_backups";

export interface BackupEntry {
  id: number;
  createdAt: string;
  source: "scheduled" | "manual";
  data: ResumeData;
}

/**
 * Lista os backups mais recentes, do mais novo para o mais antigo.
 *
 * A tabela já mantém no máximo 30 linhas (ver `create_portfolio_backup`
 * em supabase/backups.sql), então o limite aqui é só uma garantia extra.
 */
export async function listBackups(): Promise<BackupEntry[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from(BACKUPS_TABLE)
    .select("id,created_at,source,data")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as number,
    createdAt: row.created_at as string,
    source: (row.source as "scheduled" | "manual") ?? "scheduled",
    data: row.data as ResumeData,
  }));
}

/**
 * Tira um snapshot manual do conteúdo atual imediatamente, via a mesma
 * função Postgres usada pelo agendamento automático diário.
 */
export async function createManualBackup(): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível criar backup na nuvem.");
  }

  const { error } = await supabase.rpc("create_portfolio_backup", { p_source: "manual" });
  if (error) throw error;
}
