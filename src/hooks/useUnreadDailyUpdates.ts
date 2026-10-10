import { useEffect, useState } from "react";
import { countUnreadDailyUpdates, DAILY_UPDATES_CHANGED_EVENT } from "../lib/dailyUpdatesService";

/** Número de atualizações diárias não lidas, para o contador da aba. */
export function useUnreadDailyUpdates(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      countUnreadDailyUpdates().then((value) => {
        if (active) setCount(value);
      }, () => undefined);
    };
    refresh();
    // Uma atualização publicada de manhã aparece quando você volta à aba do navegador.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener(DAILY_UPDATES_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener(DAILY_UPDATES_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return count;
}
