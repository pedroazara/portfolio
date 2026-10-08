import { isDevPreview } from "./devPreview";
import { isSupabaseConfigured, supabase } from "./supabase";

export type ProjectStatus = "planned" | "active" | "paused" | "completed";

export interface WorkspaceChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  milestone_id: string | null;
}

export interface WorkspaceMilestone {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
}

export interface WorkspaceProjectUpdate {
  id: string;
  body: string;
  kind: "progress" | "decision" | "blocker";
  resolved: boolean;
  created_at: string;
}

/** Projetos privados de trabalho; não publica nem altera os projetos do portfólio. */
export interface AdminWorkspaceProject {
  id: string;
  title: string;
  goal: string;
  due_date: string | null;
  status: ProjectStatus;
  task_ids: string[];
  note_ids: string[];
  link_ids: string[];
  next_task_id: string | null;
  // Opcionais no contrato legado; toda leitura preenche os valores padrão.
  portfolio_project_id?: string | null;
  checklist_items?: WorkspaceChecklistItem[];
  milestones?: WorkspaceMilestone[];
  updates?: WorkspaceProjectUpdate[];
  created_at: string;
  updated_at: string;
}

export type WorkspaceProjectFields = Omit<
  AdminWorkspaceProject,
  "id" | "created_at" | "updated_at"
>;
export type CreateWorkspaceProjectInput = Pick<
  WorkspaceProjectFields,
  "title" | "goal"
> &
  Partial<Omit<WorkspaceProjectFields, "title" | "goal">>;

export const WORKSPACE_PROJECTS_CHANGED_EVENT = "workspace-projects-changed";
const STORAGE_KEY = "sandbox:workspace-projects:v1";
const TABLE = "admin_workspace_projects";
const STATUSES: ProjectStatus[] = ["planned", "active", "paused", "completed"];

function notifyChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WORKSPACE_PROJECTS_CHANGED_EVENT));
  }
}

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase não configurado — os projetos pessoais precisam da nuvem.",
    );
  }
}

function cloudError(
  error: { code?: string; message?: string },
  action: string,
): Error {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return new Error(
      "A área de projetos ainda precisa ser ativada na sua conta. As demais ferramentas continuam disponíveis.",
    );
  }
  if (error.code === "42703" || error.code === "PGRST204") {
    return new Error(
      "O acompanhamento de projetos precisa ser atualizado na sua conta. Seus dados existentes foram preservados.",
    );
  }
  if (error.code === "23505") return duplicatePortfolioError();
  if (error.code === "PGRST116") return conflictError();
  return new Error(
    `Não foi possível ${action}. ${error.message || "Tente novamente."}`,
  );
}

function conflictError() {
  return new Error(
    "Este projeto foi alterado ou removido em outra aba. Atualize os projetos antes de salvar novamente para preservar as alterações.",
  );
}

function duplicatePortfolioError() {
  return new Error(
    "Este projeto do portfólio já tem um acompanhamento. Abra o acompanhamento existente.",
  );
}

function nextUpdatedAt(previous?: string) {
  return new Date(
    Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0),
  ).toISOString();
}

function validDate(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

function normalizedIds(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.some((id) => typeof id !== "string" || !id.trim())
  ) {
    throw new Error(
      "Os vínculos do projeto precisam ter identificadores válidos.",
    );
  }
  return [...new Set(value.map((id: string) => id.trim()))];
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maxLength
  )
    throw new Error(`${label} precisa ter entre 1 e ${maxLength} caracteres.`);
  return value.trim();
}

function trackingArray<T>(
  value: unknown,
  label: string,
  limit: number,
  normalize: (record: Record<string, unknown>) => T & { id: string },
): T[] {
  if (!Array.isArray(value) || value.length > limit)
    throw new Error(`${label}: use uma lista com até ${limit} itens.`);
  const ids = new Set<string>();
  return value.map((record: unknown) => {
    if (!record || typeof record !== "object" || Array.isArray(record))
      throw new Error(`${label}: item inválido.`);
    const item = normalize(record as Record<string, unknown>);
    if (ids.has(item.id))
      throw new Error(`${label}: os identificadores precisam ser únicos.`);
    ids.add(item.id);
    return item;
  });
}

function itemDate(value: unknown): string | null {
  if (!validDate(value))
    throw new Error("Escolha uma data válida para o item do projeto.");
  return value;
}

function itemBoolean(value: unknown): boolean {
  if (typeof value !== "boolean")
    throw new Error("Escolha uma situação válida para o item do projeto.");
  return value;
}

function checklistItems(value: unknown): WorkspaceChecklistItem[] {
  return trackingArray(value, "Checklist", 500, (item) => {
    if (!["low", "medium", "high"].includes(item.priority as string))
      throw new Error("Escolha uma prioridade válida para o checklist.");
    return {
      id: requiredText(item.id, "O identificador", 200),
      title: requiredText(item.title, "O título do item", 300),
      completed: itemBoolean(item.completed),
      due_date: itemDate(item.due_date),
      priority: item.priority as WorkspaceChecklistItem["priority"],
      milestone_id:
        item.milestone_id === null
          ? null
          : requiredText(item.milestone_id, "O marco", 200),
    };
  });
}

function projectMilestones(value: unknown): WorkspaceMilestone[] {
  return trackingArray(value, "Marcos", 100, (item) => ({
    id: requiredText(item.id, "O identificador", 200),
    title: requiredText(item.title, "O título do marco", 300),
    due_date: itemDate(item.due_date),
    completed: itemBoolean(item.completed),
  }));
}

function projectUpdates(value: unknown): WorkspaceProjectUpdate[] {
  return trackingArray(value, "Atualizações", 500, (item) => {
    if (!["progress", "decision", "blocker"].includes(item.kind as string))
      throw new Error("Escolha um tipo válido para a atualização.");
    if (
      typeof item.created_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(item.created_at) ||
      !validDate(item.created_at.slice(0, 10)) ||
      !Number.isFinite(Date.parse(item.created_at))
    )
      throw new Error("A atualização precisa ter uma data válida.");
    return {
      id: requiredText(item.id, "O identificador", 200),
      body: requiredText(item.body, "A atualização", 5000),
      kind: item.kind as WorkspaceProjectUpdate["kind"],
      resolved: itemBoolean(item.resolved),
      created_at: item.created_at,
    };
  });
}

function assertMilestones(
  project: Pick<WorkspaceProjectFields, "milestones" | "checklist_items">,
) {
  const ids = new Set((project.milestones ?? []).map((item) => item.id));
  if (
    (project.checklist_items ?? []).some(
      (item) => item.milestone_id !== null && !ids.has(item.milestone_id),
    )
  )
    throw new Error(
      "Cada item do checklist precisa estar vinculado a um marco existente ou ficar sem marco.",
    );
}

function normalizeTracking(project: AdminWorkspaceProject): AdminWorkspaceProject {
  const tracking = validatePatch({
    portfolio_project_id: project.portfolio_project_id ?? null,
    checklist_items:
      project.checklist_items === undefined ? [] : project.checklist_items,
    milestones: project.milestones === undefined ? [] : project.milestones,
    updates: project.updates === undefined ? [] : project.updates,
  });
  assertMilestones(tracking);
  return { ...project, ...tracking };
}

function assertPortfolioUnique(
  projects: AdminWorkspaceProject[],
  project: AdminWorkspaceProject | WorkspaceProjectFields,
  excludedId?: string,
) {
  if (
    project.portfolio_project_id &&
    projects.some(
      (item) => item.id !== excludedId && item.portfolio_project_id === project.portfolio_project_id,
    )
  )
    throw duplicatePortfolioError();
}

function validatePatch(
  input: Partial<WorkspaceProjectFields>,
): Partial<WorkspaceProjectFields> {
  const patch: Partial<WorkspaceProjectFields> = {};
  if (input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      throw new Error("Dê um nome ao projeto.");
    }
    patch.title = input.title.trim();
    if (patch.title.length > 200)
      throw new Error("O nome do projeto pode ter até 200 caracteres.");
  }
  if (input.goal !== undefined) {
    if (typeof input.goal !== "string")
      throw new Error("Escreva uma meta válida para o projeto.");
    patch.goal = input.goal.trim();
    if (patch.goal.length > 10000)
      throw new Error("A meta do projeto pode ter até 10000 caracteres.");
  }
  if (input.due_date !== undefined) {
    if (!validDate(input.due_date))
      throw new Error("Escolha uma data válida para o prazo do projeto.");
    patch.due_date = input.due_date;
  }
  if (input.status !== undefined) {
    if (!STATUSES.includes(input.status))
      throw new Error("Escolha uma situação válida para o projeto.");
    patch.status = input.status;
  }
  for (const field of ["task_ids", "note_ids", "link_ids"] as const) {
    if (input[field] !== undefined) patch[field] = normalizedIds(input[field]);
  }
  if (input.next_task_id !== undefined) {
    if (
      input.next_task_id !== null &&
      (typeof input.next_task_id !== "string" || !input.next_task_id.trim())
    ) {
      throw new Error("Escolha uma próxima ação válida.");
    }
    patch.next_task_id = input.next_task_id?.trim() ?? null;
  }
  if (input.portfolio_project_id !== undefined)
    patch.portfolio_project_id =
      input.portfolio_project_id === null
        ? null
        : requiredText(input.portfolio_project_id, "O projeto do portfólio", 200);
  if (input.checklist_items !== undefined)
    patch.checklist_items = checklistItems(input.checklist_items);
  if (input.milestones !== undefined)
    patch.milestones = projectMilestones(input.milestones);
  if (input.updates !== undefined)
    patch.updates = projectUpdates(input.updates);
  return patch;
}

function assertNextTask(
  project: Pick<WorkspaceProjectFields, "task_ids" | "next_task_id">,
) {
  if (
    project.next_task_id !== null &&
    !project.task_ids.includes(project.next_task_id)
  ) {
    throw new Error(
      "A próxima ação precisa ser uma tarefa vinculada ao projeto.",
    );
  }
}

function readPreview(): AdminWorkspaceProject[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error(
      "Não foi possível acessar os projetos locais. Verifique o armazenamento do navegador.",
    );
  }
  if (raw === null) return [];
  try {
    const records: unknown = JSON.parse(raw);
    if (!Array.isArray(records)) throw new Error();
    const ids = new Set<string>();
    for (const record of records) {
      if (
        !record ||
        typeof record !== "object" ||
        typeof record.id !== "string" ||
        !record.id.trim() ||
        ids.has(record.id)
      )
        throw new Error();
      ids.add(record.id);
      for (const field of [
        "title",
        "goal",
        "due_date",
        "status",
        "task_ids",
        "note_ids",
        "link_ids",
        "next_task_id",
      ] as const) {
        if (record[field] === undefined) throw new Error();
      }
      for (const field of ["created_at", "updated_at"] as const) {
        if (
          typeof record[field] !== "string" ||
          !Number.isFinite(Date.parse(record[field]))
        )
          throw new Error();
      }
      const checked = validatePatch(record);
      for (const field of ["task_ids", "note_ids", "link_ids"] as const) {
        if (checked[field]?.length !== record[field].length) throw new Error();
      }
      assertNextTask(record);
    }
    const normalized = (records as AdminWorkspaceProject[]).map(normalizeTracking);
    normalized.forEach((project) =>
      assertPortfolioUnique(normalized, project, project.id),
    );
    return normalized;
  } catch {
    throw new Error(
      "Não foi possível ler os projetos locais. Os dados salvos foram preservados.",
    );
  }
}

function mutatePreview<T>(change: (projects: AdminWorkspaceProject[]) => T): T {
  const projects = readPreview();
  const result = change(projects);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    throw new Error(
      "Não foi possível salvar o projeto no navegador. Os dados anteriores foram preservados.",
    );
  }
  notifyChanged();
  return result;
}

function findPreview(projects: AdminWorkspaceProject[], id: string) {
  const project = projects.find((item) => item.id === id);
  if (!project)
    throw new Error(
      "Projeto não encontrado. Atualize a lista e tente novamente.",
    );
  return project;
}

export async function listWorkspaceProjects(): Promise<
  AdminWorkspaceProject[]
> {
  if (isDevPreview()) {
    return readPreview().sort(
      (a, b) =>
        b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id),
    );
  }
  assertConfigured();
  const projects: AdminWorkspaceProject[] = [];
  // Não perde projetos quando a coleção ultrapassa o limite padrão da API.
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw cloudError(error, "carregar os projetos");
    const page = ((data ?? []) as AdminWorkspaceProject[]).map(normalizeTracking);
    projects.push(...page);
    if (page.length < 1000) return projects;
  }
}

export async function createWorkspaceProject(
  input: CreateWorkspaceProjectInput,
): Promise<AdminWorkspaceProject> {
  const patch = validatePatch(input);
  if (!patch.title) throw new Error("Dê um nome ao projeto.");
  if (patch.goal === undefined)
    throw new Error("Escreva uma meta válida para o projeto.");
  const fields: WorkspaceProjectFields = {
    due_date: null,
    status: "planned",
    task_ids: [],
    note_ids: [],
    link_ids: [],
    next_task_id: null,
    portfolio_project_id: null,
    checklist_items: [],
    milestones: [],
    updates: [],
    ...patch,
    title: patch.title,
    goal: patch.goal,
  };
  assertNextTask(fields);
  assertMilestones(fields);
  if (isDevPreview())
    return mutatePreview((projects) => {
      assertPortfolioUnique(projects, fields);
      const now = new Date().toISOString();
      const project: AdminWorkspaceProject = {
        ...fields,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      };
      projects.push(project);
      return project;
    });
  assertConfigured();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(fields)
    .select("*")
    .single();
  if (error) throw cloudError(error, "criar o projeto");
  notifyChanged();
  return normalizeTracking(data as AdminWorkspaceProject);
}

export async function updateWorkspaceProject(
  id: string,
  input: Partial<WorkspaceProjectFields>,
  expectedUpdatedAt?: string,
): Promise<AdminWorkspaceProject> {
  const patch = validatePatch(input);
  if (
    expectedUpdatedAt !== undefined &&
    !Number.isFinite(Date.parse(expectedUpdatedAt))
  )
    throw conflictError();
  if (isDevPreview())
    return mutatePreview((projects) => {
      const project = findPreview(projects, id);
      if (
        expectedUpdatedAt !== undefined &&
        Date.parse(project.updated_at) !== Date.parse(expectedUpdatedAt)
      )
        throw conflictError();
      const updated = {
        ...project,
        ...patch,
        updated_at: nextUpdatedAt(project.updated_at),
      };
      assertNextTask(updated);
      assertMilestones(updated);
      assertPortfolioUnique(projects, updated, id);
      Object.assign(project, updated);
      return project;
    });
  assertConfigured();
  if (patch.task_ids !== undefined || patch.next_task_id !== undefined) {
    if (patch.task_ids !== undefined && patch.next_task_id !== undefined) {
      assertNextTask({
        task_ids: patch.task_ids,
        next_task_id: patch.next_task_id,
      });
    } else {
      const { data, error } = await supabase
        .from(TABLE)
        .select("task_ids,next_task_id")
        .eq("id", id)
        .single();
      if (error) throw cloudError(error, "verificar as tarefas do projeto");
      assertNextTask({ ...data, ...patch });
    }
  }
  if (patch.milestones !== undefined || patch.checklist_items !== undefined) {
    if (patch.milestones !== undefined && patch.checklist_items !== undefined) {
      assertMilestones(patch);
    } else {
      const { data, error } = await supabase
        .from(TABLE)
        .select("milestones,checklist_items")
        .eq("id", id)
        .single();
      if (error) throw cloudError(error, "verificar os marcos do projeto");
      assertMilestones({ ...data, ...patch });
    }
  }
  let query = supabase
    .from(TABLE)
    .update({ ...patch, updated_at: nextUpdatedAt(expectedUpdatedAt) })
    .eq("id", id);
  if (expectedUpdatedAt !== undefined)
    query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query
    .select("*")
    .single();
  if (error) throw cloudError(error, "salvar o projeto");
  notifyChanged();
  return normalizeTracking(data as AdminWorkspaceProject);
}

export async function deleteWorkspaceProject(id: string): Promise<void> {
  if (isDevPreview())
    return mutatePreview((projects) => {
      findPreview(projects, id);
      projects.splice(
        projects.findIndex((item) => item.id === id),
        1,
      );
    });
  assertConfigured();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw cloudError(error, "excluir o projeto");
  notifyChanged();
}
