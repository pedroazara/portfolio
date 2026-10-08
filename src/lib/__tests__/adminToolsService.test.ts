import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(), sandbox: vi.fn(() => true), configured: true,
}));
vi.mock("../supabase", () => ({
  supabase: { from: mocks.from },
  get isSupabaseConfigured() { return mocks.configured; },
}));
vi.mock("../devPreview", () => ({ isDevPreview: mocks.sandbox }));

import {
  ADMIN_WORKSPACE_CHANGED_EVENT, createTask, listTasks, updateTask, deleteTask,
  createHabit, listHabits, deleteHabit, setHabitLog, listHabitLogs,
  createNote, listNotes, updateNote, deleteNote,
  createLink, listLinks, updateLink, deleteLink,
  createDraft, listDrafts, updateDraft, deleteDraft,
} from "../adminToolsService";

const storageKey = "sandbox:personal-workspace:v1";
let values: Map<string, string>;
let dispatchEvent: ReturnType<typeof vi.fn>;
let setItem: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sandbox.mockReturnValue(true);
  mocks.configured = true;
  values = new Map();
  dispatchEvent = vi.fn();
  setItem = vi.fn((key: string, value: string) => { values.set(key, value); });
  vi.stubGlobal("window", {
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem },
    dispatchEvent,
  });
});

afterEach(() => {
  if (mocks.sandbox()) expect(mocks.from).not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("personal workspace preview", () => {
  it("starts empty without requiring Supabase or reading other local workspaces", async () => {
    mocks.configured = false;
    values.set("admin:personal-workspace:v1", JSON.stringify({ tasks: [{ title: "Private" }] }));
    expect(await Promise.all([
      listTasks(), listHabits(), listHabitLogs("2026-01-01"), listNotes(), listLinks(), listDrafts(),
    ])).toEqual([[], [], [], [], [], []]);
    expect(setItem).not.toHaveBeenCalled();
    expect(dispatchEvent).not.toHaveBeenCalled();
    const task = await createTask({ title: "Local only" });
    expect(task.title).toBe("Local only");
    expect(values.get("admin:personal-workspace:v1")).toContain("Private");
    expect([...values.keys()]).toEqual(["admin:personal-workspace:v1", storageKey]);
  });

  it("persists task edits, respects board order, and deletes the selected task", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T10:00:00.000Z"));
    const later = await createTask({ title: "Later", position: 2 });
    const first = await createTask({ title: "First", position: 0 });
    expect((await listTasks()).map((task) => task.id)).toEqual([first.id, later.id]);
    vi.setSystemTime(new Date("2026-10-07T11:00:00.000Z"));
    await updateTask(first.id, { title: "Finished", status: "done", notes: "Reviewed" });
    expect((await listTasks())[0]).toMatchObject({
      id: first.id, title: "Finished", status: "done", notes: "Reviewed",
      created_at: "2026-10-07T10:00:00.000Z", updated_at: "2026-10-07T11:00:00.000Z",
    });
    expect(JSON.parse(values.get(storageKey)!).tasks).toHaveLength(2);
    await deleteTask(first.id);
    expect((await listTasks()).map((task) => task.id)).toEqual([later.id]);
  });

  it("keeps daily habit logs unique, supports undo, and cascades deletion", async () => {
    const habit = await createHabit("Ler");
    const other = await createHabit("Caminhar");
    await setHabitLog(habit.id, "2026-10-06", true);
    await setHabitLog(habit.id, "2026-10-07", true);
    await setHabitLog(habit.id, "2026-10-07", true);
    await setHabitLog(other.id, "2026-10-07", true);
    expect(await listHabitLogs("2026-10-07")).toEqual([
      { habit_id: habit.id, log_date: "2026-10-07" },
      { habit_id: other.id, log_date: "2026-10-07" },
    ]);
    await setHabitLog(habit.id, "2026-10-07", false);
    expect(await listHabitLogs("2026-10-07")).toHaveLength(1);
    await deleteHabit(habit.id);
    expect(await listHabits()).toEqual([other]);
    expect(await listHabitLogs("2026-01-01")).toEqual([
      { habit_id: other.id, log_date: "2026-10-07" },
    ]);
    await expect(setHabitLog(habit.id, "2026-10-07", true)).rejects.toThrow(/não encontrado/);
  });

  it("persists note, bookmark, and draft updates independently", async () => {
    const note = await createNote({});
    const link = await createLink({ title: "Referência", url: "https://example.com" });
    const draft = await createDraft({});
    expect(note).toMatchObject({ title: null, content: "" });
    expect(link).toMatchObject({ tags: [], notes: null });
    expect(draft).toMatchObject({ title: "Sem título", content: "", tags: [] });
    await updateNote(note.id, { title: "Ideia", content: "Uma nova seção" });
    await updateLink(link.id, { title: "Inspiração", notes: "Salvar", tags: ["design"] });
    await updateDraft(draft.id, { title: "Artigo", content: "Texto", tags: ["carreira"] });
    expect(await listNotes()).toEqual([expect.objectContaining({ id: note.id, title: "Ideia", content: "Uma nova seção" })]);
    expect(await listLinks()).toEqual([expect.objectContaining({ id: link.id, title: "Inspiração", notes: "Salvar", tags: ["design"] })]);
    expect(await listDrafts()).toEqual([expect.objectContaining({ id: draft.id, title: "Artigo", content: "Texto", tags: ["carreira"] })]);
    await deleteNote(note.id);
    await deleteLink(link.id);
    await deleteDraft(draft.id);
    expect(await Promise.all([listNotes(), listLinks(), listDrafts()])).toEqual([[], [], []]);
  });

  it("notifies only after a successful persisted change", async () => {
    const note = await createNote({ content: "Saved" });
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0].type).toBe(ADMIN_WORKSPACE_CHANGED_EVENT);
    dispatchEvent.mockClear();
    setItem.mockImplementation(() => { throw new Error("Storage full"); });
    await expect(updateNote(note.id, { content: "Lost" })).rejects.toThrow("Storage full");
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect((await listNotes())[0].content).toBe("Saved");
  });

  it("preserves damaged storage rather than silently overwriting it", async () => {
    values.set(storageKey, "invalid JSON");
    await expect(createTask({ title: "Test" })).rejects.toThrow(/dados locais/);
    expect(values.get(storageKey)).toBe("invalid JSON");
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});

describe("production workspace", () => {
  beforeEach(() => { mocks.sandbox.mockReturnValue(false); });

  it("loads habit history beyond the default 1,000-row cloud limit", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({ habit_id: `habit-${i}`, log_date: "2026-10-06" }));
    const lastPage = [{ habit_id: "habit-1", log_date: "2026-10-07" }];
    const query = {
      select: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValueOnce({ data: firstPage, error: null })
        .mockResolvedValueOnce({ data: lastPage, error: null }),
    };
    mocks.from.mockReturnValue(query);
    expect(await listHabitLogs("2025-10-07")).toEqual([...firstPage, ...lastPage]);
    expect(query.range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
    expect(query.gte).toHaveBeenCalledWith("log_date", "2025-10-07");
    expect(query.order).toHaveBeenCalledWith("log_date", { ascending: true });
    expect(query.order).toHaveBeenCalledWith("habit_id", { ascending: true });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("does not return partial habit history if a later cloud page fails", async () => {
    const query = {
      select: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValueOnce({ data: Array(1000).fill({ habit_id: "habit", log_date: "2026-10-06" }), error: null })
        .mockResolvedValueOnce({ data: null, error: new Error("Connection interrupted") }),
    };
    mocks.from.mockReturnValue(query);
    await expect(listHabitLogs("2025-10-07")).rejects.toThrow("Connection interrupted");
  });

  it("reads the cloud rather than exposing records from preview", async () => {
    values.set(storageKey, "invalid JSON");
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) => resolve({ data: [{ id: "cloud-task" }], error: null }),
    };
    mocks.from.mockReturnValue(query);
    expect(await listTasks()).toEqual([{ id: "cloud-task" }]);
    expect(mocks.from).toHaveBeenCalledWith("admin_tasks");
    expect(setItem).not.toHaveBeenCalled();
  });

  it("emits the same event after cloud success and none after a failed write", async () => {
    const query = {
      insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "cloud-note" }, error: null }),
    };
    mocks.from.mockReturnValue(query);
    await createNote({ content: "Saved remotely" });
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0].type).toBe(ADMIN_WORKSPACE_CHANGED_EVENT);
    dispatchEvent.mockClear();
    query.single.mockResolvedValue({ data: null, error: new Error("Denied") });
    await expect(createNote({ content: "Denied" })).rejects.toThrow("Denied");
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("still requires Supabase configuration outside preview", async () => {
    mocks.configured = false;
    await expect(listTasks()).rejects.toThrow(/Supabase não configurado/);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
