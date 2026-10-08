import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Flame,
  Check,
  Sprout,
  CalendarDays,
  TrendingUp,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
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

function recentDays(today: string, count: number): string[] {
  const now = new Date(`${today}T12:00:00`);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - count + index + 1);
    return todayKey(day);
  });
}

/** Keep yesterday's streak alive until today's check-in; the visible count is capped at 365. */
function streakOf(marked: Set<string>, today: string): number {
  const now = new Date(`${today}T12:00:00`);
  const start = marked.has(today) ? 0 : 1;
  let streak = 0;
  for (let index = start; index < start + 365; index++) {
    const day = new Date(now);
    day.setDate(now.getDate() - index);
    if (!marked.has(todayKey(day))) break;
    streak++;
  }
  return streak;
}

function habitStart(habit: AdminHabit): string {
  const created = new Date(habit.created_at);
  return Number.isNaN(created.getTime()) ? "1970-01-01" : todayKey(created);
}

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
const dateLabel = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
});

export default function HabitTracker() {
  const [habits, setHabits] = useState<AdminHabit[]>([]);
  const [logs, setLogs] = useState<AdminHabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newHabit, setNewHabit] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminHabit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [today, setToday] = useState(() => todayKey());
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const pendingWrites = useRef(new Set<string>());
  const creating = useRef(false);
  const deleting = useRef<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const days = useMemo(
    () => recentDays(today, windowDays),
    [today, windowDays],
  );
  const monthDays = useMemo(() => recentDays(today, 30), [today]);
  const weekDays = useMemo(() => recentDays(today, 7), [today]);
  const historyStart = useMemo(() => recentDays(today, 366)[0], [today]);

  const loadHabits = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [habitList, logList] = await Promise.all([
        listHabits(),
        listHabitLogs(historyStart),
      ]);
      setHabits(habitList);
      setLogs(logList);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayKey()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    void loadHabits();
  }, [historyStart]);

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
    if (!name || creating.current) return;
    creating.current = true;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createHabit(name);
      setHabits((prev) => [...prev, created]);
      setNewHabit("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      creating.current = false;
      setIsCreating(false);
    }
  };

  const toggle = async (habit: AdminHabit, day: string) => {
    const key = `${habit.id}:${day}`;
    if (
      pendingWrites.current.has(key) ||
      deleting.current === habit.id ||
      day > today ||
      day < habitStart(habit)
    )
      return;
    const isMarked = markedByHabit.get(habit.id)?.has(day) ?? false;
    pendingWrites.current.add(key);
    setPending(new Set(pendingWrites.current));
    setError(null);
    setLogs((prev) =>
      isMarked
        ? prev.filter(
            (log) => !(log.habit_id === habit.id && log.log_date === day),
          )
        : [...prev, { habit_id: habit.id, log_date: day }],
    );
    try {
      await setHabitLog(habit.id, day, !isMarked);
    } catch (err) {
      setError((err as Error).message);
      setLogs((prev) => {
        const withoutDay = prev.filter(
          (log) => !(log.habit_id === habit.id && log.log_date === day),
        );
        return isMarked
          ? [...withoutDay, { habit_id: habit.id, log_date: day }]
          : withoutDay;
      });
    } finally {
      pendingWrites.current.delete(key);
      setPending(new Set(pendingWrites.current));
    }
  };

  const confirmDelete = async () => {
    if (
      !pendingDelete ||
      deleting.current ||
      [...pendingWrites.current].some((key) =>
        key.startsWith(`${pendingDelete.id}:`),
      )
    )
      return;
    const id = pendingDelete.id;
    deleting.current = id;
    setDeletingId(id);
    setPendingDelete(null);
    setError(null);
    try {
      await deleteHabit(id);
      setHabits((prev) => prev.filter((habit) => habit.id !== id));
      setLogs((prev) => prev.filter((log) => log.habit_id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      deleting.current = null;
      setDeletingId(null);
    }
  };

  const todayDone = habits.filter((habit) =>
    markedByHabit.get(habit.id)?.has(today),
  ).length;
  const weekDone = habits.reduce(
    (sum, habit) =>
      sum +
      weekDays.filter(
        (day) =>
          day >= habitStart(habit) && markedByHabit.get(habit.id)?.has(day),
      ).length,
    0,
  );
  const bestStreak = Math.max(
    0,
    ...habits.map((habit) =>
      streakOf(markedByHabit.get(habit.id) ?? new Set(), today),
    ),
  );
  const todayPercent = habits.length
    ? Math.round((todayDone / habits.length) * 100)
    : 0;

  if (isLoading)
    return (
      <div
        role="status"
        aria-label="Carregando hábitos"
        className="animate-pulse space-y-4"
      >
        <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 bg-violet-50/70 p-5 dark:border-violet-500/20 dark:bg-violet-500/10">
          <div className="flex items-center justify-between text-xs font-medium text-violet-700 dark:text-violet-300">
            <span>Seu ritmo hoje</span>
            <Sprout className="h-4 w-4" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {todayDone}
            <span className="ml-1 text-lg font-normal text-slate-400">
              / {habits.length}
            </span>
          </p>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/40"
            role="progressbar"
            aria-label="Hábitos realizados hoje"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={todayPercent}
          >
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${todayPercent}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Últimos 7 dias</span>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {String(weekDone).padStart(2, "0")}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            check-ins que fizeram a diferença
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Maior sequência atual</span>
            <Flame className="h-4 w-4 text-orange-400" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {bestStreak}
            {bestStreak === 365 ? "+" : ""}
            <span className="ml-1.5 text-sm font-normal text-slate-400">
              {bestStreak === 1 ? "dia" : "dias"}
            </span>
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Seu progresso, um dia de cada vez
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-500 sm:flex dark:bg-violet-500/10">
          <Plus className="h-5 w-5" />
        </div>
        <label htmlFor="new-habit" className="sr-only">
          Nome do novo hábito
        </label>
        <input
          ref={nameInput}
          id="new-habit"
          value={newHabit}
          onChange={(event) => setNewHabit(event.target.value)}
          disabled={isCreating}
          maxLength={200}
          placeholder="Qual pequeno hábito você quer cultivar?"
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400 dark:text-white"
        />
        <button
          type="submit"
          disabled={isCreating || !newHabit.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-default disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isCreating ? "Criando..." : "Criar hábito"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadHabits()}
            disabled={isCreating || pending.size > 0 || Boolean(deletingId)}
            className="font-semibold underline underline-offset-4 disabled:opacity-50"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 dark:bg-violet-500/10">
            <Sprout className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Pequeno hoje. Transformador com o tempo.
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            Ler, estudar, se movimentar. Escolha um hábito simples e acompanhe
            sua constância por aqui.
          </p>
          <button
            type="button"
            onClick={() => nameInput.current?.focus()}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400"
          >
            Criar meu primeiro hábito
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-white">
                Consistência em movimento
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Clique em um dia para registrar ou desfazer um check-in.
              </p>
            </div>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
              {([7, 30] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setWindowDays(count)}
                  aria-pressed={windowDays === count}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${windowDays === count ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {count} dias
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {habits.map((habit) => {
              const marked = markedByHabit.get(habit.id) ?? new Set<string>();
              const start = habitStart(habit);
              const streak = streakOf(marked, today);
              const completedToday = marked.has(today);
              const eligibleDays = monthDays.filter((day) => day >= start);
              const monthDone = eligibleDays.filter((day) =>
                marked.has(day),
              ).length;
              const monthPercent = eligibleDays.length
                ? Math.round((monthDone / eligibleDays.length) * 100)
                : 0;
              const busy = deletingId === habit.id;
              const hasPending = [...pending].some((key) =>
                key.startsWith(`${habit.id}:`),
              );
              return (
                <section
                  key={habit.id}
                  className="rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${completedToday ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10" : "bg-violet-50 text-violet-500 dark:bg-violet-500/10"}`}
                    >
                      {completedToday ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Sprout className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">
                        {habit.name}
                      </h3>
                      <p
                        className={`mt-0.5 text-[11px] ${completedToday ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
                      >
                        {completedToday
                          ? "Seu check-in de hoje está feito"
                          : "Mais uma chance de cuidar de você"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(habit)}
                      disabled={busy || hasPending || Boolean(deletingId)}
                      aria-label={`Excluir hábito ${habit.name}`}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:text-slate-600 dark:hover:bg-rose-950/40"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div
                    className={`mt-6 grid ${windowDays === 7 ? "grid-cols-7 gap-2" : "grid-cols-10 gap-1.5"}`}
                  >
                    {days.map((day) => {
                      const date = new Date(`${day}T12:00:00`);
                      const isMarked = marked.has(day);
                      const isToday = day === today;
                      const isPending = pending.has(`${habit.id}:${day}`);
                      const notStarted = day < start;
                      return (
                        <div key={day} className="min-w-0 text-center">
                          {windowDays === 7 && (
                            <span
                              className={`mb-2 block text-[10px] font-medium ${isToday ? "text-violet-600 dark:text-violet-400" : "text-slate-400"}`}
                            >
                              {isToday
                                ? "hoje"
                                : weekday.format(date).replace(".", "")}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => void toggle(habit, day)}
                            disabled={isPending || busy || notStarted}
                            title={`${dateLabel.format(date)}${notStarted ? " · antes da criação deste hábito" : isMarked ? " · concluído" : " · marcar como feito"}`}
                            aria-label={`${habit.name}, ${dateLabel.format(date)}${notStarted ? ", antes da criação" : ""}`}
                            aria-pressed={isMarked}
                            className={`relative flex w-full items-center justify-center rounded-xl text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-default ${windowDays === 7 ? "h-11" : "h-8 rounded-lg text-[10px]"} ${isMarked ? "bg-violet-500 text-white hover:bg-violet-600" : "bg-slate-50 text-slate-400 hover:bg-violet-50 hover:text-violet-500 dark:bg-slate-800 dark:hover:bg-violet-500/10"} ${isToday ? "ring-2 ring-violet-300 ring-offset-2 dark:ring-violet-700 dark:ring-offset-slate-900" : ""} ${notStarted ? "opacity-30" : ""}`}
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isMarked ? (
                              <Check
                                className={
                                  windowDays === 7 ? "h-4 w-4" : "h-3 w-3"
                                }
                              />
                            ) : (
                              date.getDate()
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <span
                      title="Sequência até hoje ou ontem, limitada aos últimos 365 dias"
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${streak ? "text-orange-500 dark:text-orange-400" : "text-slate-400"}`}
                    >
                      <Flame className="h-3.5 w-3.5" />
                      {streak > 0
                        ? `${streak}${streak === 365 ? "+" : ""} ${streak === 1 ? "dia seguido" : "dias seguidos"}`
                        : "Comece sua sequência"}
                    </span>
                    <span
                      title={`${monthDone} check-ins em ${eligibleDays.length} dias desde a criação, nos últimos 30 dias`}
                      className="text-[11px] text-slate-400"
                    >
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {monthPercent}%
                      </span>{" "}
                      nos últimos 30 dias
                    </span>
                  </div>
                </section>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-violet-500" />
              Concluído
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800" />
              Pendente
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {dateLabel.format(new Date(`${days[0]}T12:00:00`))} —{" "}
              {dateLabel.format(new Date(`${today}T12:00:00`))}
            </span>
          </div>
          {todayDone === habits.length && habits.length > 0 && (
            <p
              aria-live="polite"
              className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              Todos os hábitos de hoje concluídos. Seu eu de amanhã agradece.
            </p>
          )}
        </>
      )}
      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir hábito"
        message={`“${pendingDelete?.name}” e todo o histórico dele serão removidos.`}
        confirmText="Excluir"
      />
    </div>
  );
}
