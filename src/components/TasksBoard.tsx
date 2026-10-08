import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  GripVertical,
  Search,
  Circle,
  CircleDashed,
  Check,
  CheckCheck,
  ArrowUpRight,
  Loader2,
  X,
  ListTodo,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import WorkspaceDialog from "./admin/WorkspaceDialog";
import ConfirmModal from "./ConfirmModal";
import {
  AdminTask,
  TaskStatus,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../lib/adminToolsService";

const COLUMNS = [
  {
    status: "todo" as const,
    label: "A fazer",
    description: "O próximo passo começa aqui",
    icon: Circle,
    color: "text-slate-500",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    empty: "Espaço para uma nova ideia.",
    action: "Adicionar tarefa",
  },
  {
    status: "doing" as const,
    label: "Em andamento",
    description: "Uma coisa de cada vez",
    icon: CircleDashed,
    color: "text-violet-500",
    badge:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
    empty: "Qual será seu foco agora?",
    action: "Adicionar ao foco",
  },
  {
    status: "done" as const,
    label: "Concluídas",
    description: "Pequenas e grandes conquistas",
    icon: CheckCheck,
    color: "text-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    empty: "Suas conquistas vão aparecer aqui.",
    action: "Registrar conquista",
  },
];
const ORDER: TaskStatus[] = ["todo", "doing", "done"];
const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function containerStatusOf(
  id: string,
  tasks: AdminTask[],
): TaskStatus | undefined {
  if (id.startsWith("column:"))
    return ORDER.find((status) => id === `column:${status}`);
  return tasks.find((task) => task.id === id)?.status;
}

export default function TasksBoard({
  requestedId,
}: {
  requestedId?: string | null;
}) {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTask | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [formStatus, setFormStatus] = useState<TaskStatus>("todo");
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminTask | null>(null);
  const [activeTask, setActiveTask] = useState<AdminTask | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const writing = useRef(false);
  const appliedRequestedId = useRef<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const loadTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTasks(await listTasks());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    void loadTasks();
  }, []);

  useEffect(() => {
    const receiveTask = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string; item: AdminTask }>)
        .detail;
      if (detail?.type !== "task" || !detail.item?.id) return;
      setTasks((current) =>
        current.some((task) => task.id === detail.item.id)
          ? current
          : [...current, detail.item],
      );
    };
    window.addEventListener("admin-workspace-entry-created", receiveTask);
    return () =>
      window.removeEventListener("admin-workspace-entry-created", receiveTask);
  }, []);

  const beginWrite = () => {
    if (writing.current) return false;
    writing.current = true;
    setIsSaving(true);
    setError(null);
    return true;
  };
  const endWrite = () => {
    writing.current = false;
    setIsSaving(false);
  };
  const nextPosition = (status: TaskStatus) =>
    Math.max(
      -1,
      ...tasks
        .filter((task) => task.status === status)
        .map((task) => task.position),
    ) + 1;
  const openNew = (status: TaskStatus = "todo") => {
    setEditing(null);
    setTitle("");
    setNotes("");
    setFormStatus(status);
    setFormError(null);
    setIsFormOpen(true);
  };
  const openEdit = (task: AdminTask) => {
    setEditing(task);
    setTitle(task.title);
    setNotes(task.notes || "");
    setFormStatus(task.status);
    setFormError(null);
    setIsFormOpen(true);
  };
  useEffect(() => {
    if (!requestedId) {
      appliedRequestedId.current = null;
      return;
    }
    if (appliedRequestedId.current === requestedId) return;
    const task = tasks.find((item) => item.id === requestedId);
    if (!task) return;
    appliedRequestedId.current = requestedId;
    setQuery("");
    setOnlyOpen(false);
    setEditing(task);
    setTitle(task.title);
    setNotes(task.notes || "");
    setFormStatus(task.status);
    setFormError(null);
    setIsFormOpen(true);
  }, [requestedId, tasks]);
  const closeForm = () => {
    if (!writing.current) setIsFormOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !beginWrite()) return;
    setFormError(null);
    try {
      if (editing) {
        const updated = await updateTask(editing.id, {
          title: title.trim(),
          notes: notes.trim() || null,
          status: formStatus,
          ...(editing.status !== formStatus
            ? { position: nextPosition(formStatus) }
            : {}),
        });
        setTasks((prev) =>
          prev.map((task) => (task.id === updated.id ? updated : task)),
        );
      } else {
        const created = await createTask({
          title: title.trim(),
          notes: notes.trim() || null,
          status: formStatus,
          position: nextPosition(formStatus),
        });
        setTasks((prev) => [...prev, created]);
      }
      setIsFormOpen(false);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      endWrite();
    }
  };

  const move = async (task: AdminTask, direction: -1 | 1) => {
    const status = ORDER[ORDER.indexOf(task.status) + direction];
    if (!status || !beginWrite()) return;
    const position = nextPosition(status);
    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, status, position } : item,
      ),
    );
    try {
      const updated = await updateTask(task.id, { status, position });
      setTasks((prev) =>
        prev.map((item) => (item.id === task.id ? updated : item)),
      );
    } catch (err) {
      setError((err as Error).message);
      setTasks((prev) =>
        prev.map((item) => (item.id === task.id ? task : item)),
      );
    } finally {
      endWrite();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !beginWrite()) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      endWrite();
    }
  };

  const handleDragStart = (event: DragStartEvent) =>
    setActiveTask(tasks.find((task) => task.id === event.active.id) ?? null);
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id || writing.current) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceStatus = containerStatusOf(activeId, tasks);
    const targetStatus = containerStatusOf(overId, tasks);
    const item = tasks.find((task) => task.id === activeId);
    if (!sourceStatus || !targetStatus || !item) return;
    const byStatus = Object.fromEntries(
      ORDER.map((status) => [
        status,
        tasks
          .filter((task) => task.status === status)
          .sort((a, b) => a.position - b.position),
      ]),
    ) as Record<TaskStatus, AdminTask[]>;
    const sourceIndex = byStatus[sourceStatus].findIndex(
      (task) => task.id === activeId,
    );
    const overIndex = byStatus[targetStatus].findIndex(
      (task) => task.id === overId,
    );
    byStatus[sourceStatus] = byStatus[sourceStatus].filter(
      (task) => task.id !== activeId,
    );
    let insertIndex = byStatus[targetStatus].length;
    if (overIndex !== -1) {
      insertIndex = byStatus[targetStatus].findIndex(
        (task) => task.id === overId,
      );
      if (sourceStatus === targetStatus && sourceIndex < overIndex)
        insertIndex += 1;
    }
    byStatus[targetStatus].splice(insertIndex, 0, {
      ...item,
      status: targetStatus,
    });
    const previous = tasks;
    const nextTasks = ORDER.flatMap((status) =>
      byStatus[status].map((task, position) => ({ ...task, status, position })),
    );
    // Compare against the original task: the inserted card already has its new status.
    const updates = nextTasks.filter((task) => {
      const original = previous.find((entry) => entry.id === task.id)!;
      return (
        original.status !== task.status || original.position !== task.position
      );
    });
    if (!updates.length || !beginWrite()) return;
    setTasks(nextTasks);
    try {
      const results = await Promise.allSettled(
        updates.map((task) =>
          updateTask(task.id, { status: task.status, position: task.position }),
        ),
      );
      const failure = results.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") {
        // Some writes may already have succeeded; reload the persisted board before unlocking it.
        try {
          setTasks(await listTasks());
        } catch {
          setTasks(previous);
        }
        throw failure.reason;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      endWrite();
    }
  };

  const done = tasks.filter((task) => task.status === "done").length;
  const doing = tasks.filter((task) => task.status === "doing").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visibleTasks = tasks.filter(
    (task) =>
      (!onlyOpen || task.status !== "done") &&
      `${task.title} ${task.notes || ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedQuery),
  );

  if (isLoading)
    return (
      <div
        className="grid animate-pulse gap-4 sm:grid-cols-3"
        role="status"
        aria-label="Carregando tarefas"
      >
        {ORDER.map((status) => (
          <div
            key={status}
            className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800/60"
          />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Tarefas em aberto"
          value={String(tasks.length - done).padStart(2, "0")}
          detail="Ideias prontas para ganhar vida"
          icon={ListTodo}
        />
        <SummaryCard
          label="No seu foco"
          value={String(doing).padStart(2, "0")}
          detail={
            doing > 2
              ? "Que tal concluir uma antes de começar outra?"
              : "Dê atenção ao que importa agora"
          }
          icon={CircleDashed}
        />
        <div className="rounded-2xl border border-violet-200/60 bg-violet-50/70 p-5 dark:border-violet-500/20 dark:bg-violet-500/10">
          <div className="flex items-center justify-between text-xs font-medium text-violet-700 dark:text-violet-300">
            <span>Seu progresso</span>
            <CheckCheck className="h-4 w-4" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {progress}
              <span className="ml-0.5 text-lg text-violet-400">%</span>
            </span>
            <span className="pb-1 text-xs text-slate-500 dark:text-slate-400">
              {done} de {tasks.length} concluídas
            </span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/40"
            role="progressbar"
            aria-label="Tarefas concluídas"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar uma tarefa..."
              aria-label="Buscar tarefas"
              className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
          <div
            className="flex w-fit gap-1 rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/60"
            aria-label="Filtrar tarefas"
          >
            {[
              { label: "Todas", value: false },
              { label: "Em aberto", value: true },
            ].map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setOnlyOpen(filter.value)}
                aria-pressed={onlyOpen === filter.value}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${onlyOpen === filter.value ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => openNew()}
          disabled={isSaving}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition hover:bg-violet-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Nova tarefa
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadTasks()}
            disabled={isSaving}
            className="font-semibold underline underline-offset-4 disabled:opacity-50"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Para mover uma tarefa, pressione espaço, use as setas e pressione espaço novamente para soltar. Pressione Escape para cancelar.",
          },
        }}
      >
        <div
          className={`grid items-start gap-4 ${onlyOpen ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
        >
          {COLUMNS.filter(
            (column) => !onlyOpen || column.status !== "done",
          ).map((column) => (
            <Column
              key={column.status}
              column={column}
              tasks={visibleTasks
                .filter((task) => task.status === column.status)
                .sort((a, b) => a.position - b.position)}
              onEdit={openEdit}
              onDelete={setPendingDelete}
              onMove={move}
              onNew={openNew}
              disabled={isSaving}
              filtered={Boolean(normalizedQuery)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="rounded-2xl border border-violet-300 bg-white p-5 shadow-xl shadow-violet-900/10 dark:border-violet-700 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {activeTask.title}
              </p>
              {activeTask.notes && (
                <p className="mt-2 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">
                  {activeTask.notes}
                </p>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <p
        aria-live="polite"
        className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Salvando alterações...
          </>
        ) : (
          <>
            <GripVertical className="h-3.5 w-3.5" />
            Arraste para organizar. Use as setas dos cartões para mudar de
            etapa.
          </>
        )}
      </p>

      {isFormOpen && (
        <WorkspaceDialog
          onClose={closeForm}
          title={editing ? "Ajustar tarefa" : "Um novo próximo passo"}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
              >
                {formError}
              </p>
            )}
            <div>
              <label
                htmlFor="task-title"
                className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                O que você quer fazer?
              </label>
              <input
                id="task-title"
                data-autofocus
                required
                maxLength={300}
                disabled={isSaving}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: publicar meu próximo projeto"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label
                htmlFor="task-notes"
                className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Detalhes{" "}
                <span className="font-normal text-slate-400">· opcional</span>
              </label>
              <textarea
                id="task-notes"
                disabled={isSaving}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Contexto, links ou pequenos passos para chegar lá..."
                className={`${INPUT_CLASS} resize-y`}
              />
            </div>
            <div>
              <label
                htmlFor="task-status"
                className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Etapa
              </label>
              <select
                id="task-status"
                disabled={isSaving}
                value={formStatus}
                onChange={(event) =>
                  setFormStatus(event.target.value as TaskStatus)
                }
                className={INPUT_CLASS}
              >
                {COLUMNS.map((column) => (
                  <option key={column.status} value={column.status}>
                    {column.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || !title.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving
                  ? "Salvando..."
                  : editing
                    ? "Salvar alterações"
                    : "Criar tarefa"}
              </button>
            </div>
          </form>
        </WorkspaceDialog>
      )}
      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir tarefa"
        message={`“${pendingDelete?.title}” será removida permanentemente.`}
        confirmText="Excluir"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ListTodo;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function Column({
  column,
  tasks,
  onEdit,
  onDelete,
  onMove,
  onNew,
  disabled,
  filtered,
}: {
  column: (typeof COLUMNS)[number];
  tasks: AdminTask[];
  onEdit: (task: AdminTask) => void;
  onDelete: (task: AdminTask) => void;
  onMove: (task: AdminTask, direction: -1 | 1) => void;
  onNew: (status: TaskStatus) => void;
  disabled: boolean;
  filtered: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.status}`,
    disabled,
  });
  const Icon = column.icon;
  return (
    <section
      className={`rounded-2xl border p-3 transition-colors ${isOver ? "border-violet-300 bg-violet-50/70 dark:border-violet-700 dark:bg-violet-500/10" : "border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40"}`}
    >
      <div className="mb-4 px-1 pt-1">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${column.color}`} />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {column.label}
          </h2>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${column.badge}`}
          >
            {tasks.length}
          </span>
          <button
            type="button"
            onClick={() => onNew(column.status)}
            disabled={disabled}
            aria-label={column.action}
            className="ml-auto rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-violet-600 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          {column.description}
        </p>
      </div>
      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="min-h-48 space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              disabled={disabled}
            />
          ))}
          {tasks.length === 0 && (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700/70">
              <span
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 ${column.color}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                {filtered ? "Nenhuma tarefa encontrada." : column.empty}
              </p>
              {!filtered && (
                <button
                  type="button"
                  onClick={() => onNew(column.status)}
                  disabled={disabled}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 dark:text-violet-400 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {column.action}
                </button>
              )}
            </div>
          )}
        </div>
      </SortableContext>
      {tasks.length > 0 && (
        <button
          type="button"
          onClick={() => onNew(column.status)}
          disabled={disabled}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white hover:text-violet-600 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {column.action}
        </button>
      )}
    </section>
  );
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onMove,
  disabled,
}: {
  task: AdminTask;
  onEdit: (task: AdminTask) => void;
  onDelete: (task: AdminTask) => void;
  onMove: (task: AdminTask, direction: -1 | 1) => void;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled });
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-shadow hover:shadow-md hover:shadow-slate-200/40 dark:border-slate-700/70 dark:bg-slate-900 dark:hover:shadow-black/10"
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${task.status === "done" ? "text-emerald-600 dark:text-emerald-400" : task.status === "doing" ? "text-violet-600 dark:text-violet-400" : "text-slate-400"}`}
        >
          {task.status === "done" ? (
            <Check className="h-3 w-3" />
          ) : (
            <span
              className={`h-1.5 w-1.5 rounded-full ${task.status === "doing" ? "bg-violet-400" : "bg-slate-300 dark:bg-slate-600"}`}
            />
          )}
          {task.status === "done"
            ? "CONCLUÍDA"
            : task.status === "doing"
              ? "EM FOCO"
              : "PRÓXIMO PASSO"}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`Arrastar tarefa ${task.title}`}
          className="touch-none rounded p-1 text-slate-300 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-violet-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-300 cursor-grab disabled:cursor-wait"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onEdit(task)}
        className={`block w-full break-words text-left text-sm font-semibold leading-6 transition hover:text-violet-600 dark:hover:text-violet-400 ${task.status === "done" ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-100"}`}
      >
        {task.title}
      </button>
      {task.notes && (
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-5 text-slate-400 dark:text-slate-500">
          {task.notes}
        </p>
      )}
      <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onMove(task, -1)}
          disabled={disabled || task.status === "todo"}
          aria-label={`Mover ${task.title} para a coluna anterior`}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(task, 1)}
          disabled={disabled || task.status === "done"}
          aria-label={`Mover ${task.title} para a próxima coluna`}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600 disabled:opacity-25 dark:hover:bg-violet-500/10"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onEdit(task)}
          aria-label={`Editar tarefa ${task.title}`}
          className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDelete(task)}
          aria-label={`Excluir tarefa ${task.title}`}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
