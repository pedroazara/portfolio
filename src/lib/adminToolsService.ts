import { supabase, isSupabaseConfigured } from "./supabase";
import { isDevPreview } from "./devPreview";

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

export const ADMIN_WORKSPACE_CHANGED_EVENT = "admin-workspace-changed";
const PREVIEW_STORAGE_KEY = "sandbox:personal-workspace:v1";

interface PreviewWorkspace {
  tasks: AdminTask[];
  habits: AdminHabit[];
  habitLogs: AdminHabitLog[];
  notes: AdminNote[];
  links: AdminLink[];
  drafts: AdminDraft[];
}

function notifyWorkspaceChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_WORKSPACE_CHANGED_EVENT));
  }
}

/** O preview começa vazio e nunca consulta nem modifica os dados privados da nuvem. */
function readPreviewWorkspace(): PreviewWorkspace {
  const empty: PreviewWorkspace = {
    tasks: [], habits: [], habitLogs: [], notes: [], links: [], drafts: [],
  };
  const raw = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
  if (!raw) return empty;
  try {
    const stored = JSON.parse(raw);
    if (!stored || typeof stored !== "object") throw new Error();
    for (const key of Object.keys(empty) as (keyof PreviewWorkspace)[]) {
      if (!Array.isArray(stored[key])) throw new Error();
    }
    return stored as PreviewWorkspace;
  } catch {
    // Não sobrescreve silenciosamente um armazenamento danificado.
    throw new Error("Não foi possível ler os dados locais do painel de teste.");
  }
}

function mutatePreview<T>(mutation: (workspace: PreviewWorkspace) => T): T {
  const workspace = readPreviewWorkspace();
  const result = mutation(workspace);
  window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(workspace));
  notifyWorkspaceChanged();
  return result;
}

function findPreviewRecord<T extends { id: string }>(records: T[], id: string): T {
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error("Registro não encontrado no painel de teste.");
  return record;
}

function newPreviewRecord() {
  return { id: crypto.randomUUID(), created_at: new Date().toISOString() };
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
  if (isDevPreview()) {
    return readPreviewWorkspace().tasks.sort((a, b) =>
      a.position - b.position || a.created_at.localeCompare(b.created_at)
    );
  }
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
  if (isDevPreview()) return mutatePreview((workspace) => {
    const record = newPreviewRecord();
    const task: AdminTask = {
      ...record, updated_at: record.created_at, title: input.title,
      notes: input.notes ?? null, status: input.status ?? "todo", position: input.position ?? 0,
    };
    workspace.tasks.push(task);
    return task;
  });
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
  notifyWorkspaceChanged();
  return data as AdminTask;
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<AdminTask, "title" | "notes" | "status" | "position">>
): Promise<AdminTask> {
  if (isDevPreview()) return mutatePreview((workspace) => {
    const task = findPreviewRecord(workspace.tasks, id);
    Object.assign(task, patch, { updated_at: new Date().toISOString() });
    return task;
  });
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  notifyWorkspaceChanged();
  return data as AdminTask;
}

export async function deleteTask(id: string): Promise<void> {
  if (isDevPreview()) return mutatePreview((workspace) => {
    workspace.tasks = workspace.tasks.filter((task) => task.id !== id);
  });
  assertConfigured();
  const { error } = await supabase.from("admin_tasks").delete().eq("id", id);
  if (error) throw error;
  notifyWorkspaceChanged();
}

// ---------------------------------------------------------------- hábitos

export async function listHabits(): Promise<AdminHabit[]> {
  if (isDevPreview()) {
    return readPreviewWorkspace().habits.filter((habit) => !habit.archived)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
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
  if (isDevPreview()) return mutatePreview((workspace) => {
    const habit: AdminHabit = { ...newPreviewRecord(), name, archived: false };
    workspace.habits.push(habit);
    return habit;
  });
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_habits")
    .insert({ name })
    .select("*")
    .single();
  if (error) throw error;
  notifyWorkspaceChanged();
  return data as AdminHabit;
}

export async function deleteHabit(id: string): Promise<void> {
  if (isDevPreview()) return mutatePreview((workspace) => {
    workspace.habits = workspace.habits.filter((habit) => habit.id !== id);
    workspace.habitLogs = workspace.habitLogs.filter((log) => log.habit_id !== id);
  });
  assertConfigured();
  const { error } = await supabase.from("admin_habits").delete().eq("id", id);
  if (error) throw error;
  notifyWorkspaceChanged();
}

/** Registros a partir de `sinceDate` (inclusive), de todos os hábitos ativos. */
export async function listHabitLogs(sinceDate: string): Promise<AdminHabitLog[]> {
  if (isDevPreview()) {
    return readPreviewWorkspace().habitLogs.filter((log) => log.log_date >= sinceDate);
  }
  assertConfigured();
  const logs: AdminHabitLog[] = [];
  const pageSize = 1000;
  // Um ano de poucos hábitos já pode ultrapassar o limite padrão do Supabase.
  // Ordenar pela chave composta mantém as páginas estáveis entre consultas.
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("admin_habit_logs")
      .select("habit_id,log_date")
      .gte("log_date", sinceDate)
      .order("log_date", { ascending: true })
      .order("habit_id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data as AdminHabitLog[]) ?? [];
    logs.push(...page);
    if (page.length < pageSize) return logs;
  }
}

export async function setHabitLog(
  habitId: string,
  logDate: string,
  done: boolean
): Promise<void> {
  if (isDevPreview()) return mutatePreview((workspace) => {
    if (done) findPreviewRecord(workspace.habits, habitId);
    workspace.habitLogs = workspace.habitLogs.filter((log) =>
      log.habit_id !== habitId || log.log_date !== logDate
    );
    if (done) workspace.habitLogs.push({ habit_id: habitId, log_date: logDate });
  });
  assertConfigured();
  if (done) {
    const { error } = await supabase
      .from("admin_habit_logs")
      .upsert({ habit_id: habitId, log_date: logDate }, { onConflict: "habit_id,log_date" });
    if (error) throw error;
    notifyWorkspaceChanged();
    return;
  }
  const { error } = await supabase
    .from("admin_habit_logs")
    .delete()
    .eq("habit_id", habitId)
    .eq("log_date", logDate);
  if (error) throw error;
  notifyWorkspaceChanged();
}

// ------------------------------------------------------------------ notas

export async function listNotes(): Promise<AdminNote[]> {
  if (isDevPreview()) {
    return readPreviewWorkspace().notes.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
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
  if (isDevPreview()) return mutatePreview((workspace) => {
    const record = newPreviewRecord();
    const note: AdminNote = {
      ...record, updated_at: record.created_at, title: input.title ?? null, content: input.content ?? "",
    };
    workspace.notes.push(note);
    return note;
  });
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_notes")
    .insert({ title: input.title ?? null, content: input.content ?? "" })
    .select("*")
    .single();
  if (error) throw error;
  notifyWorkspaceChanged();
  return data as AdminNote;
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<AdminNote, "title" | "content">>
): Promise<AdminNote> {
  if (isDevPreview()) return mutatePreview((workspace) => {
    const note = findPreviewRecord(workspace.notes, id);
    Object.assign(note, patch, { updated_at: new Date().toISOString() });
    return note;
  });
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_notes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  notifyWorkspaceChanged();
  return data as AdminNote;
}

export async function deleteNote(id: string): Promise<void> {
  if (isDevPreview()) return mutatePreview((workspace) => {
    workspace.notes = workspace.notes.filter((note) => note.id !== id);
  });
  assertConfigured();
  const { error } = await supabase.from("admin_notes").delete().eq("id", id);
  if (error) throw error;
  notifyWorkspaceChanged();
}

// ------------------------------------------------------------------ links

export async function listLinks(): Promise<AdminLink[]> {
  if (isDevPreview()) {
    return readPreviewWorkspace().links.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
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
  if (isDevPreview()) return mutatePreview((workspace) => {
    const link: AdminLink = {
      ...newPreviewRecord(), url: input.url, title: input.title,
      notes: input.notes ?? null, tags: input.tags ?? [],
    };
    workspace.links.push(link);
    return link;
  });
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
  notifyWorkspaceChanged();
  return data as AdminLink;
}

export async function updateLink(
  id: string,
  patch: Partial<Pick<AdminLink, "url" | "title" | "notes" | "tags">>
): Promise<AdminLink> {
  if (isDevPreview()) return mutatePreview((workspace) => {
    const link = findPreviewRecord(workspace.links, id);
    Object.assign(link, patch);
    return link;
  });
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_links")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  notifyWorkspaceChanged();
  return data as AdminLink;
}

export async function deleteLink(id: string): Promise<void> {
  if (isDevPreview()) return mutatePreview((workspace) => {
    workspace.links = workspace.links.filter((link) => link.id !== id);
  });
  assertConfigured();
  const { error } = await supabase.from("admin_links").delete().eq("id", id);
  if (error) throw error;
  notifyWorkspaceChanged();
}

// -------------------------------------------------------------- rascunhos

export async function listDrafts(): Promise<AdminDraft[]> {
  if (isDevPreview()) {
    return readPreviewWorkspace().drafts.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
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
  if (isDevPreview()) return mutatePreview((workspace) => {
    const record = newPreviewRecord();
    const draft: AdminDraft = {
      ...record, updated_at: record.created_at, title: input.title ?? "Sem título",
      content: input.content ?? "", tags: input.tags ?? [],
    };
    workspace.drafts.push(draft);
    return draft;
  });
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
  notifyWorkspaceChanged();
  return data as AdminDraft;
}

export async function updateDraft(
  id: string,
  patch: Partial<Pick<AdminDraft, "title" | "content" | "tags">>
): Promise<AdminDraft> {
  if (isDevPreview()) return mutatePreview((workspace) => {
    const draft = findPreviewRecord(workspace.drafts, id);
    Object.assign(draft, patch, { updated_at: new Date().toISOString() });
    return draft;
  });
  assertConfigured();
  const { data, error } = await supabase
    .from("admin_drafts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  notifyWorkspaceChanged();
  return data as AdminDraft;
}

export async function deleteDraft(id: string): Promise<void> {
  if (isDevPreview()) return mutatePreview((workspace) => {
    workspace.drafts = workspace.drafts.filter((draft) => draft.id !== id);
  });
  assertConfigured();
  const { error } = await supabase.from("admin_drafts").delete().eq("id", id);
  if (error) throw error;
  notifyWorkspaceChanged();
}
