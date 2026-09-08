import { useEffect, useRef, useState } from "react";
import { scopedKey } from "../lib/localWorkspace";

export function useEditorDraft<T>(id: string, value: T, dirty: boolean) {
  const key = scopedKey(`editor:${id}`);
  const [saved, setSaved] = useState<{ at: string; value: T } | null>(() => {
    try { const raw = localStorage.getItem(key); const v = raw && JSON.parse(raw); return v && typeof v.at === "string" && v.value && typeof v.value === "object" ? v : null; } catch { return null; }
  });
  const [error, setError] = useState("");
  const latest = useRef({ value, dirty });
  latest.current = { value, dirty };
  const cleared = useRef("");
  const persist = () => {
    const current = latest.current;
    if (!current.dirty || JSON.stringify(current.value) === cleared.current) return;
    try { localStorage.setItem(key, JSON.stringify({ at: new Date().toISOString(), value: current.value })); }
    catch { setError("Não foi possível guardar a recuperação local. Exporte uma cópia."); }
  };
  useEffect(() => { const timer = setTimeout(persist, 350); return () => clearTimeout(timer); }, [value, dirty, key]);
  useEffect(() => { window.addEventListener("pagehide", persist); return () => { persist(); window.removeEventListener("pagehide", persist); }; }, [key]);
  const clear = () => { cleared.current = JSON.stringify(latest.current.value); localStorage.removeItem(key); setSaved(null); };
  return { saved, error, clear, dismiss: () => setSaved(null) };
}
