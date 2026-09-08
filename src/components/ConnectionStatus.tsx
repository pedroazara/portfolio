import React, { useEffect, useState } from "react";
export default function ConnectionStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null);
  useEffect(() => {
    const change = () => setOffline(!navigator.onLine);
    window.addEventListener("online", change); window.addEventListener("offline", change);
    const ready = (event: Event) => setUpdate((event as CustomEvent).detail);
    window.addEventListener("portfolio:update", ready);
    return () => { window.removeEventListener("online", change); window.removeEventListener("offline", change); window.removeEventListener("portfolio:update", ready); };
  }, []);
  if (!offline && !update) return null;
  return <div role="status" className="no-print fixed bottom-3 right-3 z-50 max-w-sm rounded-xl border border-borda bg-superficie p-3 text-sm text-tinta shadow-lg">
    {offline ? "Sem conexão. Você está vendo a cópia disponível neste dispositivo." : <><span>Nova versão disponível. Salve suas edições antes de atualizar.</span><button className="ml-2 underline" onClick={() => {
      navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
      update?.waiting?.postMessage({ type: "SKIP_WAITING" });
    }}>Atualizar</button></>}
  </div>;
}
