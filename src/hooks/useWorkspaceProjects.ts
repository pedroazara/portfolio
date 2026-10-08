import { useCallback, useEffect, useRef, useState } from "react";
import {
  listWorkspaceProjects,
  WORKSPACE_PROJECTS_CHANGED_EVENT,
  type AdminWorkspaceProject,
} from "../lib/workspaceProjectsService";

export function useWorkspaceProjects() {
  const [projects, setProjects] = useState<AdminWorkspaceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);

  const refresh = useCallback(async (options?: { throwOnError?: boolean }) => {
    const id = ++request.current;
    try {
      const result = await listWorkspaceProjects();
      if (id !== request.current) return;
      setProjects(result);
      setError("");
    } catch (cause) {
      if (id !== request.current) return;
      // Conserva a última lista carregada se uma atualização falhar.
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar seus projetos.",
      );
      if (options?.throwOnError) throw cause;
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => {
      void refresh();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "sandbox:workspace-projects:v1")
        void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener(WORKSPACE_PROJECTS_CHANGED_EVENT, onChanged);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      request.current++;
      window.removeEventListener(WORKSPACE_PROJECTS_CHANGED_EVENT, onChanged);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { projects, loading, error, refresh };
}
