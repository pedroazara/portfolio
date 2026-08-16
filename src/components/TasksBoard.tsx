import React, { useEffect, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
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

export default function TasksBoard() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTask | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminTask | null>(null);

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
        const created = await createTask({ title: title.trim(), notes: notes.trim() || null });
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

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-slate-400">Carregando tarefas…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
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

      <div className="grid gap-4 sm:grid-cols-3">
        {COLUMNS.map(({ status, label }) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <section
              key={status}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40"
            >
              <h2 className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {columnTasks.length}
                </span>
              </h2>

              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="block w-full text-left text-sm font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 cursor-pointer"
                    >
                      {task.title}
                    </button>
                    {task.notes && (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-400">
                        {task.notes}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(task, -1)}
                        disabled={status === "todo"}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer disabled:cursor-default"
                        aria-label="Mover para a coluna anterior"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(task, 1)}
                        disabled={status === "done"}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer disabled:cursor-default"
                        aria-label="Mover para a próxima coluna"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(task)}
                        className="ml-auto rounded p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
                        aria-label="Excluir tarefa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                ))}

                {columnTasks.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">Vazio</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

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
