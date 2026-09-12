import React, { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2, GripVertical } from "lucide-react";
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
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import {
  AdminTask,
  TaskStatus,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../lib/adminToolsService";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "A fazer" },
  { status: "doing", label: "Fazendo" },
  { status: "done", label: "Feito" },
];

const ORDER: TaskStatus[] = ["todo", "doing", "done"];

/** Extrai o status de um id de destino de drop: cartão (id da tarefa) ou coluna vazia (`column:status`). */
function containerStatusOf(id: string, tasks: AdminTask[]): TaskStatus | undefined {
  if (id.startsWith("column:")) return id.slice("column:".length) as TaskStatus;
  return tasks.find((t) => t.id === id)?.status;
}

export default function TasksBoard() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTask | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminTask | null>(null);
  const [activeTask, setActiveTask] = useState<AdminTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    listTasks()
      .then(setTasks)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const openNew = () => {
    setEditing(null);
    setTitle("");
    setNotes("");
    setIsFormOpen(true);
  };

  const openEdit = (task: AdminTask) => {
    setEditing(task);
    setTitle(task.title);
    setNotes(task.notes || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      if (editing) {
        const updated = await updateTask(editing.id, { title: title.trim(), notes: notes.trim() || null });
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const position = tasks.filter((t) => t.status === "todo").length;
        const created = await createTask({ title: title.trim(), notes: notes.trim() || null, position });
        setTasks((prev) => [...prev, created]);
      }
      setIsFormOpen(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const move = async (task: AdminTask, direction: -1 | 1) => {
    const nextIndex = ORDER.indexOf(task.status) + direction;
    if (nextIndex < 0 || nextIndex >= ORDER.length) return;
    const status = ORDER[nextIndex];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await updateTask(task.id, { status });
    } catch (err) {
      setError((err as Error).message);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceStatus = containerStatusOf(activeId, tasks);
    const targetStatus = containerStatusOf(overId, tasks);
    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!sourceStatus || !targetStatus || !activeTaskItem) return;

    const byStatus: Record<TaskStatus, AdminTask[]> = {
      todo: tasks.filter((t) => t.status === "todo").sort((a, b) => a.position - b.position),
      doing: tasks.filter((t) => t.status === "doing").sort((a, b) => a.position - b.position),
      done: tasks.filter((t) => t.status === "done").sort((a, b) => a.position - b.position),
    };

    byStatus[sourceStatus] = byStatus[sourceStatus].filter((t) => t.id !== activeId);

    let insertIndex = byStatus[targetStatus].length;
    if (!overId.startsWith("column:")) {
      const idx = byStatus[targetStatus].findIndex((t) => t.id === overId);
      if (idx !== -1) insertIndex = idx;
    }
    byStatus[targetStatus] = [
      ...byStatus[targetStatus].slice(0, insertIndex),
      { ...activeTaskItem, status: targetStatus },
      ...byStatus[targetStatus].slice(insertIndex),
    ];

    const previous = tasks;
    const nextTasks: AdminTask[] = [];
    const updates: { id: string; status: TaskStatus; position: number }[] = [];
    (Object.keys(byStatus) as TaskStatus[]).forEach((status) => {
      byStatus[status].forEach((t, index) => {
        nextTasks.push({ ...t, status, position: index });
        if (t.status !== status || t.position !== index) {
          updates.push({ id: t.id, status, position: index });
        }
      });
    });

    if (updates.length === 0) return;

    setTasks(nextTasks);
    try {
      await Promise.all(updates.map((u) => updateTask(u.id, { status: u.status, position: u.position })));
    } catch (err) {
      setError((err as Error).message);
      setTasks(previous);
    }
  };

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-slate-500">Carregando tarefas…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
        </span>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nova tarefa
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {COLUMNS.map(({ status, label }) => (
            <Column
              key={status}
              status={status}
              label={label}
              tasks={tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position)}
              onEdit={openEdit}
              onDelete={setPendingDelete}
              onMove={move}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCardBody task={activeTask} dragging />}
        </DragOverlay>
      </DndContext>

      <EditModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? "Editar tarefa" : "Nova tarefa"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Título
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-hidden focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-hidden focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </form>
      </EditModal>

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir tarefa"
        message={`"${pendingDelete?.title}" será removida permanentemente.`}
        confirmText="Excluir"
      />
    </div>
  );
}

function Column({
  status,
  label,
  tasks,
  onEdit,
  onDelete,
  onMove,
}: {
  status: TaskStatus;
  label: string;
  tasks: AdminTask[];
  onEdit: (task: AdminTask) => void;
  onDelete: (task: AdminTask) => void;
  onMove: (task: AdminTask, direction: -1 | 1) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `column:${status}` });

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
      <h2 className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {tasks.length}
        </span>
      </h2>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="min-h-[44px] space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
          ))}
          {tasks.length === 0 && <p className="py-6 text-center text-xs text-slate-500">Vazio</p>}
        </div>
      </SortableContext>
    </section>
  );
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onMove,
}: {
  task: AdminTask;
  onEdit: (task: AdminTask) => void;
  onDelete: (task: AdminTask) => void;
  onMove: (task: AdminTask, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 touch-none rounded p-0.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400 cursor-grab"
          aria-label="Arrastar tarefa"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <TaskCardBody task={task} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
        </div>
      </div>
    </article>
  );
}

/** Conteúdo do cartão, compartilhado entre o cartão real (interativo) e o preview do DragOverlay (estático). */
function TaskCardBody({
  task,
  onEdit,
  onDelete,
  onMove,
  dragging,
}: {
  task: AdminTask;
  onEdit?: (task: AdminTask) => void;
  onDelete?: (task: AdminTask) => void;
  onMove?: (task: AdminTask, direction: -1 | 1) => void;
  dragging?: boolean;
}) {
  if (dragging) {
    return (
      <div className="rounded-lg border border-indigo-300 bg-white p-3 shadow-lg dark:border-indigo-700 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{task.title}</p>
        {task.notes && (
          <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-400">{task.notes}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onEdit?.(task)}
        className="block w-full text-left text-sm font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 cursor-pointer"
      >
        {task.title}
      </button>
      {task.notes && (
        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-400">{task.notes}</p>
      )}
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMove?.(task, -1)}
          disabled={task.status === "todo"}
          className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer disabled:cursor-default"
          aria-label="Mover para a coluna anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove?.(task, 1)}
          disabled={task.status === "done"}
          className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer disabled:cursor-default"
          aria-label="Mover para a próxima coluna"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete?.(task)}
          className="ml-auto rounded p-1 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
          aria-label="Excluir tarefa"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}
