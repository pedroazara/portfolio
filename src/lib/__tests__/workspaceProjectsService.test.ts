import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  preview: vi.fn(() => true),
  configured: true,
}));
vi.mock("../supabase", () => ({
  supabase: { from: mocks.from },
  get isSupabaseConfigured() {
    return mocks.configured;
  },
}));
vi.mock("../devPreview", () => ({ isDevPreview: mocks.preview }));

import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  listWorkspaceProjects,
  updateWorkspaceProject,
  WORKSPACE_PROJECTS_CHANGED_EVENT,
  type AdminWorkspaceProject,
  type CreateWorkspaceProjectInput,
  type WorkspaceChecklistItem,
  type WorkspaceMilestone,
  type WorkspaceProjectUpdate,
} from "../workspaceProjectsService";

const key = "sandbox:workspace-projects:v1";
const trackingDefaults = {
  portfolio_project_id: null,
  checklist_items: [],
  milestones: [],
  updates: [],
};
const milestone: WorkspaceMilestone = {
  id: "prototype",
  title: "Primeiro protótipo",
  due_date: "2026-11-01",
  completed: false,
};
const checklistItem: WorkspaceChecklistItem = {
  id: "sensor",
  title: "Calibrar o sensor",
  completed: false,
  due_date: "2026-10-20",
  priority: "high",
  milestone_id: "prototype",
};
const projectUpdate: WorkspaceProjectUpdate = {
  id: "first-update",
  body: "Aguardando o sensor chegar",
  kind: "blocker",
  resolved: false,
  created_at: "2026-10-08T10:00:00.000Z",
};
let storage: Map<string, string>;
let setItem: ReturnType<typeof vi.fn>;
let dispatch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.preview.mockReturnValue(true);
  mocks.configured = true;
  storage = new Map();
  setItem = vi.fn((key: string, value: string) => storage.set(key, value));
  dispatch = vi.fn();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem,
    },
    dispatchEvent: dispatch,
  });
});

afterEach(() => {
  if (mocks.preview()) expect(mocks.from).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("workspace projects preview", () => {
  it("loads legacy projects with tracking defaults without overwriting stored data", async () => {
    const project = await createWorkspaceProject({ title: "Legado", goal: "Preservar", note_ids: ["private-note"] });
    const legacy = { ...project };
    delete legacy.portfolio_project_id;
    delete legacy.checklist_items;
    delete legacy.milestones;
    delete legacy.updates;
    const original = JSON.stringify([legacy]);
    storage.set(key, original);
    setItem.mockClear();
    expect(await listWorkspaceProjects()).toEqual([{ ...legacy, ...trackingDefaults }]);
    expect(storage.get(key)).toBe(original);
    expect(setItem).not.toHaveBeenCalled();
    await updateWorkspaceProject(project.id, { milestones: [milestone], checklist_items: [checklistItem] });
    expect((await listWorkspaceProjects())[0]).toMatchObject({
      title: "Legado", goal: "Preservar", note_ids: ["private-note"],
      milestones: [milestone], checklist_items: [checklistItem], updates: [],
    });
  });

  it("persists portfolio links, milestones, checklist progress and resolved blockers", async () => {
    const project = await createWorkspaceProject({
      title: "CascaVibe", goal: "Validar sensores", portfolio_project_id: "  casca-vibe-public  ",
      milestones: [milestone], checklist_items: [checklistItem], updates: [projectUpdate],
    });
    const updated = await updateWorkspaceProject(project.id, {
      milestones: [{ ...milestone, completed: true }],
      checklist_items: [{ ...checklistItem, completed: true, title: "  Sensor calibrado  " }],
      updates: [{ ...projectUpdate, resolved: true }],
    }, project.updated_at);
    expect(updated).toMatchObject({
      portfolio_project_id: "casca-vibe-public", milestones: [{ ...milestone, completed: true }],
      checklist_items: [{ ...checklistItem, completed: true, title: "Sensor calibrado" }],
      updates: [{ ...projectUpdate, resolved: true }],
    });
    expect(await listWorkspaceProjects()).toEqual([updated]);
  });

  it("prevents duplicate portfolio tracking during create and relink, allowing independent projects", async () => {
    const first = await createWorkspaceProject({ title: "Primeiro", goal: "", portfolio_project_id: "public-slug" });
    const second = await createWorkspaceProject({ title: "Outro", goal: "" });
    const original = storage.get(key);
    await expect(createWorkspaceProject({ title: "Duplicado", goal: "", portfolio_project_id: " public-slug " })).rejects.toThrow(/já tem um acompanhamento/);
    await expect(updateWorkspaceProject(second.id, { portfolio_project_id: "public-slug" })).rejects.toThrow(/já tem um acompanhamento/);
    expect(storage.get(key)).toBe(original);
    await updateWorkspaceProject(first.id, { portfolio_project_id: "public-slug" });
    await updateWorkspaceProject(first.id, { portfolio_project_id: null });
    await updateWorkspaceProject(second.id, { portfolio_project_id: "public-slug" });
    expect((await listWorkspaceProjects()).find((item) => item.id === second.id)?.portfolio_project_id).toBe("public-slug");
  });

  it("rejects a stale update even when two edits happen within the same millisecond", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T10:00:00Z"));
    const project = await createWorkspaceProject({ title: "Inicial", goal: "" });
    const firstEdit = await updateWorkspaceProject(project.id, { goal: "Alteração em outra aba" }, project.updated_at);
    expect(Date.parse(firstEdit.updated_at)).toBeGreaterThan(Date.parse(project.updated_at));
    const original = storage.get(key);
    dispatch.mockClear();
    await expect(updateWorkspaceProject(project.id, { goal: "Valor desatualizado" }, project.updated_at)).rejects.toThrow(/outra aba/);
    expect(storage.get(key)).toBe(original);
    expect(dispatch).not.toHaveBeenCalled();
    const secondEdit = await updateWorkspaceProject(project.id, { title: "Atual" }, firstEdit.updated_at);
    expect(secondEdit.goal).toBe("Alteração em outra aba");
  });

  it("requires milestone references to stay valid and supports atomic removal", async () => {
    await expect(createWorkspaceProject({ title: "Órfão", goal: "", checklist_items: [checklistItem] })).rejects.toThrow(/marco existente/);
    const project = await createWorkspaceProject({ title: "Marcos", goal: "", milestones: [milestone], checklist_items: [checklistItem] });
    const original = storage.get(key);
    await expect(updateWorkspaceProject(project.id, { milestones: [] })).rejects.toThrow(/marco existente/);
    await expect(updateWorkspaceProject(project.id, { checklist_items: [{ ...checklistItem, milestone_id: "missing" }] })).rejects.toThrow(/marco existente/);
    expect(storage.get(key)).toBe(original);
    const updated = await updateWorkspaceProject(project.id, { milestones: [], checklist_items: [{ ...checklistItem, milestone_id: null }] });
    expect(updated.milestones).toEqual([]);
    expect(updated.checklist_items?.[0].milestone_id).toBeNull();
  });

  it.each([
    { portfolio_project_id: " " },
    { portfolio_project_id: "x".repeat(201) },
    { checklist_items: null },
    { checklist_items: [{ ...checklistItem, completed: "false" }] },
    { checklist_items: [{ ...checklistItem, priority: "urgent" }] },
    { checklist_items: [{ ...checklistItem, due_date: "2026-02-29" }] },
    { checklist_items: [{ ...checklistItem, title: "" }] },
    { checklist_items: [checklistItem, { ...checklistItem, id: " sensor " }] },
    { checklist_items: Array.from({ length: 501 }, (_, index) => ({ ...checklistItem, id: String(index) })) },
    { milestones: [milestone, milestone] },
    { milestones: [{ ...milestone, due_date: "2026-04-31" }] },
    { milestones: Array.from({ length: 101 }, (_, index) => ({ ...milestone, id: String(index) })) },
    { updates: [projectUpdate, projectUpdate] },
    { updates: [{ ...projectUpdate, body: "x".repeat(5001) }] },
    { updates: [{ ...projectUpdate, kind: "other" }] },
    { updates: [{ ...projectUpdate, created_at: "2026-02-30T10:00:00Z" }] },
    { updates: [{ ...projectUpdate, created_at: "yesterday" }] },
    { updates: [{ ...projectUpdate, resolved: null }] },
    { updates: Array.from({ length: 501 }, (_, index) => ({ ...projectUpdate, id: String(index) })) },
  ])("preserves existing data when a tracking field is invalid (case %#)", async (patch) => {
    const project = await createWorkspaceProject({ title: "Original", goal: "", milestones: [milestone], checklist_items: [checklistItem], updates: [projectUpdate] });
    const original = storage.get(key);
    dispatch.mockClear();
    await expect(updateWorkspaceProject(project.id, patch as never)).rejects.toThrow();
    expect(storage.get(key)).toBe(original);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("starts isolated and works without a configured cloud", async () => {
    mocks.configured = false;
    storage.set("admin:workspace-projects:v1", "private project");
    storage.set("sandbox:personal-workspace:v1", "other tools");
    expect(await listWorkspaceProjects()).toEqual([]);
    expect(setItem).not.toHaveBeenCalled();
    const created = await createWorkspaceProject({
      title: "  Pesquisa  ",
      goal: "  Publicar resultados  ",
    });
    expect(created).toMatchObject({
      title: "Pesquisa",
      goal: "Publicar resultados",
      status: "planned",
      due_date: null,
      task_ids: [],
      note_ids: [],
      link_ids: [],
      next_task_id: null,
    });
    expect(await listWorkspaceProjects()).toEqual([created]);
    expect(storage.get("admin:workspace-projects:v1")).toBe("private project");
    expect(storage.get("sandbox:personal-workspace:v1")).toBe("other tools");
    expect(dispatch.mock.calls[0][0].type).toBe(
      WORKSPACE_PROJECTS_CHANGED_EVENT,
    );
  });

  it("saves all fields, normalizes links and preserves creation time on edits", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T10:00:00Z"));
    const project = await createWorkspaceProject({
      title: "Estudo",
      goal: "Uma apresentação",
      due_date: "2028-02-29",
      status: "active",
      task_ids: ["first", "first", " second "],
      note_ids: ["note", "note"],
      link_ids: ["link"],
      next_task_id: "first",
    });
    expect(project.task_ids).toEqual(["first", "second"]);
    expect(project.note_ids).toEqual(["note"]);
    vi.setSystemTime(new Date("2026-10-07T11:00:00Z"));
    const updated = await updateWorkspaceProject(project.id, {
      title: "Apresentação",
      status: "completed",
      due_date: null,
      next_task_id: null,
      task_ids: ["second"],
    });
    expect(updated).toMatchObject({
      title: "Apresentação",
      status: "completed",
      due_date: null,
      next_task_id: null,
      task_ids: ["second"],
      note_ids: ["note"],
      link_ids: ["link"],
      created_at: "2026-10-07T10:00:00.000Z",
      updated_at: "2026-10-07T11:00:00.000Z",
    });
    expect(JSON.parse(storage.get(key)!)).toEqual([updated]);
  });

  it("deletes only the chosen project and leaves linked tools intact", async () => {
    storage.set("sandbox:personal-workspace:v1", "task/note/link data");
    const first = await createWorkspaceProject({
      title: "Primeiro",
      goal: "",
      task_ids: ["shared"],
    });
    const second = await createWorkspaceProject({
      title: "Segundo",
      goal: "",
      task_ids: ["shared"],
    });
    await deleteWorkspaceProject(first.id);
    expect(await listWorkspaceProjects()).toEqual([second]);
    expect(storage.get("sandbox:personal-workspace:v1")).toBe(
      "task/note/link data",
    );
    await expect(deleteWorkspaceProject("missing")).rejects.toThrow(
      /não encontrado/,
    );
  });

  it.each([
    "2026-02-29",
    "1900-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-01",
    "2026-01-00",
    "0000-01-01",
    "26-10-07",
    "2026-10-07T12:00:00Z",
    "",
  ])("rejects invalid calendar date %s before writing", async (due_date) => {
    await expect(
      createWorkspaceProject({ title: "Teste", goal: "", due_date }),
    ).rejects.toThrow(/data válida/);
    expect(setItem).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([
    "2000-02-29",
    "2024-02-29",
    "2026-02-28",
    "2026-12-31",
    "0001-01-01",
  ])("accepts valid calendar date %s", async (due_date) => {
    const project = await createWorkspaceProject({
      title: "Data",
      goal: "",
      due_date,
    });
    expect(project.due_date).toBe(due_date);
  });

  it.each([
    { title: "  " },
    { title: null },
    { goal: null },
    { status: "other" },
    { task_ids: [null] },
    { note_ids: [" "] },
    { link_ids: "bad" },
    { next_task_id: "" },
  ])(
    "rejects invalid fields without replacing an existing project: %j",
    async (patch) => {
      const project = await createWorkspaceProject({
        title: "Original",
        goal: "Preservar",
      });
      const original = storage.get(key);
      dispatch.mockClear();
      await expect(
        updateWorkspaceProject(project.id, patch as never),
      ).rejects.toThrow();
      expect(storage.get(key)).toBe(original);
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it("requires the next action to stay linked, while allowing a deliberate unlink", async () => {
    await expect(
      createWorkspaceProject({
        title: "Teste",
        goal: "",
        next_task_id: "orphan",
      }),
    ).rejects.toThrow(/vinculada/);
    const project = await createWorkspaceProject({
      title: "Teste",
      goal: "",
      task_ids: ["next"],
      next_task_id: "next",
    });
    const original = storage.get(key);
    await expect(
      updateWorkspaceProject(project.id, { task_ids: [] }),
    ).rejects.toThrow(/vinculada/);
    await expect(
      updateWorkspaceProject(project.id, { next_task_id: "orphan" }),
    ).rejects.toThrow(/vinculada/);
    expect(storage.get(key)).toBe(original);
    await updateWorkspaceProject(project.id, {
      task_ids: [],
      next_task_id: null,
    });
    expect((await listWorkspaceProjects())[0].next_task_id).toBeNull();
  });

  it.each(["invalid JSON", "{}", '[{"id":"partial"}]', "null", ""])(
    "preserves damaged storage %s rather than replacing it",
    async (raw) => {
      storage.set(key, raw);
      await expect(listWorkspaceProjects()).rejects.toThrow(/preservados/);
      await expect(
        createWorkspaceProject({ title: "Teste", goal: "" }),
      ).rejects.toThrow(/preservados/);
      await expect(deleteWorkspaceProject("anything")).rejects.toThrow(
        /preservados/,
      );
      expect(storage.get(key)).toBe(raw);
      expect(setItem).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it("reports quota errors without replacing records or announcing success", async () => {
    const project = await createWorkspaceProject({ title: "Salvo", goal: "" });
    dispatch.mockClear();
    setItem.mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    await expect(
      updateWorkspaceProject(project.id, { title: "Perdido" }),
    ).rejects.toThrow(/dados anteriores foram preservados/);
    await expect(deleteWorkspaceProject(project.id)).rejects.toThrow(
      /dados anteriores foram preservados/,
    );
    expect(await listWorkspaceProjects()).toEqual([project]);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("ignores fields outside the editable contract", async () => {
    const project = await createWorkspaceProject({
      title: "Safe",
      goal: "",
      id: "forced",
    } as CreateWorkspaceProjectInput);
    const updated = await updateWorkspaceProject(project.id, {
      id: "other",
      created_at: "bad",
    } as never);
    expect(project.id).not.toBe("forced");
    expect(updated.id).toBe(project.id);
    expect(updated.created_at).toBe(project.created_at);
  });
});

describe("workspace projects cloud", () => {
  beforeEach(() => {
    mocks.preview.mockReturnValue(false);
  });

  function queryReturning(data: unknown, error: unknown = null) {
    const result = { data, error };
    const query = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue(result),
      single: vi.fn().mockResolvedValue(result),
      then: (resolve: (value: unknown) => void) => resolve(result),
    };
    mocks.from.mockReturnValue(query);
    return query;
  }

  it("reads only the private cloud table, including subsequent pages", async () => {
    storage.set(key, "bad preview data");
    const first = Array.from({ length: 1000 }, (_, index) => ({
      id: `p-${index}`,
    }));
    const last = [{ id: "last" }];
    const query = queryReturning([]);
    query.range
      .mockResolvedValueOnce({ data: first, error: null })
      .mockResolvedValueOnce({ data: last, error: null });
    expect(await listWorkspaceProjects()).toEqual([...first, ...last].map((item) => ({ ...item, ...trackingDefaults })));
    expect(query.range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(
      mocks.from.mock.calls.every(
        ([table]) => table === "admin_workspace_projects",
      ),
    ).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not expose incomplete results if a later page fails", async () => {
    const query = queryReturning([]);
    query.range
      .mockResolvedValueOnce({
        data: Array(1000).fill({ id: "project" }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Connection lost" },
      });
    await expect(listWorkspaceProjects()).rejects.toThrow("Connection lost");
  });

  it("creates, updates and deletes remotely, notifying only confirmed changes", async () => {
    const query = queryReturning({ id: "cloud-project" });
    expect(
      await createWorkspaceProject({ title: "Cloud", goal: "Meta" }),
    ).toEqual({ id: "cloud-project", ...trackingDefaults });
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cloud",
        goal: "Meta",
        task_ids: [],
        status: "planned",
      }),
    );
    await updateWorkspaceProject("cloud-project", { status: "active" });
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" }),
    );
    await deleteWorkspaceProject("cloud-project");
    expect(query.delete).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("validates a next-action-only edit against saved task links before writing", async () => {
    const query = queryReturning({ task_ids: ["valid"], next_task_id: null });
    await expect(
      updateWorkspaceProject("cloud-project", { next_task_id: "orphan" }),
    ).rejects.toThrow(/vinculada/);
    expect(query.select).toHaveBeenCalledWith("task_ids,next_task_id");
    expect(query.update).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    await updateWorkspaceProject("cloud-project", { next_task_id: "valid" });
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ next_task_id: "valid" }),
    );
  });

  it("can atomically clear the next action and its linked task", async () => {
    const query = queryReturning({
      id: "cloud-project",
    } as AdminWorkspaceProject);
    await updateWorkspaceProject("cloud-project", {
      task_ids: [],
      next_task_id: null,
    });
    expect(query.select).not.toHaveBeenCalledWith("task_ids,next_task_id");
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ task_ids: [], next_task_id: null }),
    );
  });

  it.each(["42P01", "PGRST205"])(
    "explains missing table error %s",
    async (code) => {
      queryReturning(null, { code, message: "Missing table" });
      await expect(listWorkspaceProjects()).rejects.toThrow(
        "A área de projetos ainda precisa ser ativada na sua conta",
      );
      await expect(
        createWorkspaceProject({ title: "Cloud", goal: "" }),
      ).rejects.toThrow(/As demais ferramentas continuam disponíveis/);
      expect(dispatch).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
    },
  );

  it("does not announce or fall back to local storage after failed cloud writes", async () => {
    queryReturning(null, { code: "42501", message: "Denied" });
    await expect(
      createWorkspaceProject({ title: "Cloud", goal: "" }),
    ).rejects.toThrow("Denied");
    await expect(
      updateWorkspaceProject("id", { title: "Cloud" }),
    ).rejects.toThrow("Denied");
    await expect(deleteWorkspaceProject("id")).rejects.toThrow("Denied");
    expect(dispatch).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("requires cloud configuration outside preview", async () => {
    mocks.configured = false;
    await expect(listWorkspaceProjects()).rejects.toThrow(
      /Supabase não configurado/,
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("guards remote updates with the exact version and reports concurrent changes", async () => {
    const expectedUpdatedAt = "2026-10-08T10:00:00.000Z";
    const query = queryReturning({ id: "cloud-project" });
    await updateWorkspaceProject("cloud-project", { goal: "Updated" }, expectedUpdatedAt);
    expect(query.eq.mock.calls).toEqual([["id", "cloud-project"], ["updated_at", expectedUpdatedAt]]);
    dispatch.mockClear();
    query.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    await expect(updateWorkspaceProject("cloud-project", { title: "Stale" }, expectedUpdatedAt)).rejects.toThrow(/outra aba/);
    expect(dispatch).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("checks existing checklist references before removing a remote milestone", async () => {
    const query = queryReturning({ id: "cloud-project", milestones: [milestone], checklist_items: [checklistItem] });
    await expect(updateWorkspaceProject("cloud-project", { milestones: [] })).rejects.toThrow(/marco existente/);
    expect(query.select).toHaveBeenCalledWith("milestones,checklist_items");
    expect(query.update).not.toHaveBeenCalled();
    await updateWorkspaceProject("cloud-project", { milestones: [], checklist_items: [{ ...checklistItem, milestone_id: null }] });
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ milestones: [], checklist_items: [{ ...checklistItem, milestone_id: null }] }));
  });

  it("explains duplicate tracking from the database without a local fallback", async () => {
    queryReturning(null, { code: "23505", message: "Unique constraint" });
    await expect(createWorkspaceProject({ title: "Duplicate", goal: "", portfolio_project_id: "public-project" })).rejects.toThrow(/já tem um acompanhamento/);
    await expect(updateWorkspaceProject("other", { portfolio_project_id: "public-project" })).rejects.toThrow(/já tem um acompanhamento/);
    expect(dispatch).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each(["PGRST204", "42703"])("explains the missing tracking migration (%s)", async (code) => {
    queryReturning(null, { code });
    await expect(updateWorkspaceProject("existing", { updates: [projectUpdate] })).rejects.toThrow(/dados existentes foram preservados/);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
