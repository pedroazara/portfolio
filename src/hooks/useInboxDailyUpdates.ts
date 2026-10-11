import { useEffect, useState } from "react";
import { countInboxDailyUpdates, DAILY_UPDATES_CHANGED_EVENT } from "../lib/dailyUpdatesService";

/** Quantas atualizações estão na caixa de entrada, para o contador da aba. */
export function useInboxDailyUpdates(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      countInboxDailyUpdates().then((value) => {
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
