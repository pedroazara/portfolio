import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_WORKSPACE_CHANGED_EVENT,
  AdminHabit,
  listHabitLogs,
  listHabits,
  setHabitLog,
  todayKey,
} from "../lib/adminToolsService";

/**
 * Hábitos de hoje para o card da agenda em Meu espaço: a lista e o que já
 * teve check-in hoje, com marcar/desmarcar. Usa o mesmo dia local do
 * acompanhamento de hábitos e se atualiza quando o painel muda em outro lugar.
 */
export function useTodayHabits() {
  const [habits, setHabits] = useState<AdminHabit[]>([]);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today, setToday] = useState(() => todayKey());

  const load = useCallback(async () => {
    const day = todayKey();
    setToday(day);
    try {
      const [list, logs] = await Promise.all([listHabits(), listHabitLogs(day)]);
      setHabits(list);
      setDone(new Set(logs.filter((log) => log.log_date === day).map((log) => log.habit_id)));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener(ADMIN_WORKSPACE_CHANGED_EVENT, refresh);
    const timer = window.setInterval(() => {
      if (todayKey() !== today) refresh();
    }, 60_000);
    return () => {
      window.removeEventListener(ADMIN_WORKSPACE_CHANGED_EVENT, refresh);
      window.clearInterval(timer);
    };
  }, [load, today]);

  const toggle = async (habitId: string) => {
    if (pending.has(habitId)) return;
    const wasDone = done.has(habitId);
    const flip = (current: Set<string>) => {
      const next = new Set(current);
      if (wasDone) next.delete(habitId);
      else next.add(habitId);
      return next;
    };
    setPending((current) => new Set(current).add(habitId));
    setDone(flip);
    try {
      await setHabitLog(habitId, today, !wasDone);
    } catch (err) {
      // Desfaz a marcação otimista.
      setDone((current) => {
        const next = new Set(current);
        if (wasDone) next.add(habitId);
        else next.delete(habitId);
        return next;
      });
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(habitId);
        return next;
      });
    }
  };

  return { habits, done, pending, loading, error, toggle };
}
