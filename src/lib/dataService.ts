import { ResumeData } from "../types";
import {
  supabase,
  isSupabaseConfigured,
  PORTFOLIO_TABLE,
  PORTFOLIO_ROW_ID,
} from "./supabase";

/**
 * Busca os dados do currículo/portfólio no Supabase.
 *
 * Retorna `null` quando a linha ainda não existe (primeiro acesso) ou quando o
 * Supabase não está configurado — nos dois casos a aplicação cai para a cópia
 * local. Erros reais de rede/permissão são lançados, para que a interface
 * distinga "ainda não há nada" de "não consegui ler".
 */
export async function fetchResumeData(): Promise<ResumeData | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from(PORTFOLIO_TABLE)
    .select("data")
    .eq("id", PORTFOLIO_ROW_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return (data.data as ResumeData) ?? null;
}

/**
 * Grava todo o currículo/portfólio no Supabase.
 * Lança o erro se a gravação falhar, para que a interface avise em vez de
 * fingir que o salvamento deu certo.
 */
export async function saveResumeData(data: ResumeData): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível salvar na nuvem.");
  }

  const { error } = await supabase
    .from(PORTFOLIO_TABLE)
    .upsert(
      {
        id: PORTFOLIO_ROW_ID,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) throw error;
}
