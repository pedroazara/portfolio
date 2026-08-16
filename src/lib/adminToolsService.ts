import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Acesso às tabelas privadas do painel pessoal (supabase/admin_tools.sql).
 *
 * Diferente do currículo, que vive num único documento JSON gravado inteiro a
 * cada edição, aqui cada registro é uma linha própria: marcar uma tarefa como
 * feita ou registrar um hábito do dia acontece dezenas de vezes por sessão e
 * não deveria reescrever o site todo.
 */

export type TaskStatus = "todo" | "doing" | "done";

export interface AdminTask {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface AdminHabit {
  id: string;
  name: string;
  archived: boolean;
  created_at: string;
}

export interface AdminHabitLog {
  habit_id: string;
  log_date: string;
}

export interface AdminNote {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AdminLink {
  id: string;
  url: string;
  title: string;
  notes: string | null;
  tags: string[];
  created_at: string;
}

export interface AdminDraft {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — o painel pessoal precisa da nuvem.");
  }
}

/** Data de hoje em `YYYY-MM-DD` no fuso local, que é como o hábito é vivido. */
export function todayKey(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- tarefas

export async function listTasks(): Promise<AdminTask[]> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_tasks")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as AdminTask[]) ?? [];
}

export async function createTask(input: {
  title: string;
  notes?: string | null;
  status?: TaskStatus;
  position?: number;
}): Promise<AdminTask> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_tasks")
    .insert({
      title: input.title,
      notes: input.notes ?? null,
      status: input.status ?? "todo",
      position: input.position ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminTask;
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<AdminTask, "title" | "notes" | "status" | "position">>
): Promise<AdminTask> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminTask;
}

export async function deleteTask(id: string): Promise<void> {
  assertConfigured();
  const { error } = await supabase.from("admin_tasks").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------- hábitos

export async function listHabits(): Promise<AdminHabit[]> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_habits")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as AdminHabit[]) ?? [];
}

export async function createHabit(name: string): Promise<AdminHabit> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_habits")
    .insert({ name })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminHabit;
}

export async function deleteHabit(id: string): Promise<void> {
  assertConfigured();
  const { error } = await supabase.from("admin_habits").delete().eq("id", id);
  if (error) throw error;
}

/** Registros a partir de `sinceDate` (inclusive), de todos os hábitos ativos. */
export async function listHabitLogs(sinceDate: string): Promise<AdminHabitLog[]> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_habit_logs")
    .select("habit_id,log_date")
    .gte("log_date", sinceDate);
  if (error) throw error;
  return (data as AdminHabitLog[]) ?? [];
}

export async function setHabitLog(
  habitId: string,
  logDate: string,
  done: boolean
): Promise<void> {
  assertConfigured();
  if (done) {
    const { error } = await supabase
      .from("admin_habit_logs")
      .upsert({ habit_id: habitId, log_date: logDate }, { onConflict: "habit_id,log_date" });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("admin_habit_logs")
    .delete()
    .eq("habit_id", habitId)
    .eq("log_date", logDate);
  if (error) throw error;
}

// ------------------------------------------------------------------ notas

export async function listNotes(): Promise<AdminNote[]> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_notes")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as AdminNote[]) ?? [];
}

export async function createNote(input: {
  title?: string | null;
  content?: string;
}): Promise<AdminNote> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_notes")
    .insert({ title: input.title ?? null, content: input.content ?? "" })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminNote;
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<AdminNote, "title" | "content">>
): Promise<AdminNote> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_notes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminNote;
}

export async function deleteNote(id: string): Promise<void> {
  assertConfigured();
  const { error } = await supabase.from("admin_notes").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------------ links

export async function listLinks(): Promise<AdminLink[]> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_links")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AdminLink[]) ?? [];
}

export async function createLink(input: {
  url: string;
  title: string;
  notes?: string | null;
  tags?: string[];
}): Promise<AdminLink> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_links")
    .insert({
      url: input.url,
      title: input.title,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminLink;
}

export async function updateLink(
  id: string,
  patch: Partial<Pick<AdminLink, "url" | "title" | "notes" | "tags">>
): Promise<AdminLink> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_links")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminLink;
}

export async function deleteLink(id: string): Promise<void> {
  assertConfigured();
  const { error } = await supabase.from("admin_links").delete().eq("id", id);
  if (error) throw error;
}

// -------------------------------------------------------------- rascunhos

export async function listDrafts(): Promise<AdminDraft[]> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_drafts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as AdminDraft[]) ?? [];
}

export async function createDraft(input: {
  title?: string;
  content?: string;
  tags?: string[];
}): Promise<AdminDraft> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_drafts")
    .insert({
      title: input.title ?? "Sem título",
      content: input.content ?? "",
      tags: input.tags ?? [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminDraft;
}

export async function updateDraft(
  id: string,
  patch: Partial<Pick<AdminDraft, "title" | "content" | "tags">>
): Promise<AdminDraft> {
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_drafts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminDraft;
}

export async function deleteDraft(id: string): Promise<void> {
  assertConfigured();
  const { error } = await supabase.from("admin_drafts").delete().eq("id", id);
  if (error) throw error;
}
