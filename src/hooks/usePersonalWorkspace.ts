import { useCallback, useEffect, useRef, useState } from "react";
import {
  listTasks,
  listHabits,
  listHabitLogs,
  listNotes,
  listLinks,
  listDrafts,
  todayKey,
  type AdminTask,
  type AdminHabit,
  type AdminHabitLog,
  type AdminNote,
  type AdminLink,
  type AdminDraft,
} from "../lib/adminToolsService";

export interface PersonalWorkspaceData {
  tasks: AdminTask[];
  habits: AdminHabit[];
  logs: AdminHabitLog[];
  notes: AdminNote[];
  links: AdminLink[];
  drafts: AdminDraft[];
}
const empty: PersonalWorkspaceData = {
  tasks: [],
  habits: [],
  logs: [],
  notes: [],
  links: [],
  drafts: [],
};
export function usePersonalWorkspace() {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    const since = new Date();
    since.setDate(since.getDate() - 29);
    try {
      const [tasks, habits, logs, notes, links, drafts] = await Promise.all([
        listTasks(),
        listHabits(),
        listHabitLogs(todayKey(since)),
        listNotes(),
        listLinks(),
        listDrafts(),
      ]);
      if (request.current !== id) return;
      setData({ tasks, habits, logs, notes, links, drafts });
      setError("");
    } catch {
      if (request.current === id)
        setError(
          "Não foi possível atualizar seu espaço. Verifique a conexão e tente novamente.",
        );
    } finally {
      if (request.current === id) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("admin-workspace-changed", refresh);
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", onVisible);
    // Refresh at local midnight so the daily habit summary never shows yesterday.
    let currentDay = todayKey();
    const dayCheck = setInterval(() => {
      const day = todayKey();
      if (day !== currentDay) {
        currentDay = day;
        void refresh();
      }
    }, 60_000);
    return () => {
      request.current++;
      clearInterval(dayCheck);
      window.removeEventListener("admin-workspace-changed", refresh);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);
  return { data, loading, error, refresh };
}
