import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Flame } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import {
  AdminHabit,
  AdminHabitLog,
  listHabits,
  createHabit,
  deleteHabit,
  listHabitLogs,
  setHabitLog,
  todayKey,
} from "../lib/adminToolsService";

const WINDOW_DAYS = 30;

/** Os últimos `WINDOW_DAYS` dias em ordem cronológica, terminando hoje. */
function recentDays(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    days.push(todayKey(day));
  }
  return days;
}

/** Dias consecutivos marcados contando de hoje para trás. */
function streakOf(marked: Set<string>): number {
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    if (!marked.has(todayKey(day))) break;
    streak++;
  }
  return streak;
}

export default function HabitTracker() {
  const [habits, setHabits] = useState<AdminHabit[]>([]);
  const [logs, setLogs] = useState<AdminHabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newHabit, setNewHabit] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminHabit | null>(null);

  const days = useMemo(recentDays, []);

  useEffect(() => {
    Promise.all([listHabits(), listHabitLogs(days[0])])
      .then(([habitList, logList]) => {
        setHabits(habitList);
        setLogs(logList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [days]);

  const markedByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of logs) {
      if (!map.has(log.habit_id)) map.set(log.habit_id, new Set());
      map.get(log.habit_id)!.add(log.log_date);
    }
    return map;
  }, [logs]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newHabit.trim();
    if (!name) return;
    try {
      const created = await createHabit(name);
      setHabits((prev) => [...prev, created]);
      setNewHabit("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggle = async (habitId: string, day: string) => {
    const isMarked = markedByHabit.get(habitId)?.has(day) ?? false;
    setLogs((prev) =>
      isMarked
        ? prev.filter((l) => !(l.habit_id === habitId && l.log_date === day))
        : [...prev, { habit_id: habitId, log_date: day }]
    );
    try {
      await setHabitLog(habitId, day, !isMarked);
    } catch (err) {
      setError((err as Error).message);
      setLogs((prev) =>
        isMarked
          ? [...prev, { habit_id: habitId, log_date: day }]
          : prev.filter((l) => !(l.habit_id === habitId && l.log_date === day))
      );
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setLogs((prev) => prev.filter((l) => l.habit_id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-slate-400">Carregando hábitos…</p>;
  }

  const today = todayKey();

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-5 flex gap-2">
        <input
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          placeholder="Novo hábito (ex: ler 20 páginas)"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-hidden focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </form>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {habits.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">Nenhum hábito ainda.</p>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const marked = markedByHabit.get(habit.id) ?? new Set<string>();
            const streak = streakOf(marked);
            return (
              <section
                key={habit.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {habit.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    {streak > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Flame className="h-3 w-3" />
                        {streak}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingDelete(habit)}
                      className="rounded p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
                      aria-label={`Excluir hábito ${habit.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {days.map((day) => {
                    const isMarked = marked.has(day);
                    const isToday = day === today;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggle(habit.id, day)}
                        title={day}
                        className={`h-6 w-6 rounded transition-colors cursor-pointer ${
                          isMarked
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                        } ${isToday ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900" : ""}`}
                        aria-label={`${habit.name} em ${day}`}
                        aria-pressed={isMarked}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir hábito"
        message={`"${pendingDelete?.name}" e todo o histórico dele serão removidos.`}
        confirmText="Excluir"
      />
    </div>
  );
}
