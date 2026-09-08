let reporter: typeof import("@sentry/react") | undefined;
const privateRoute = () => /(^|\/)admin(\/|$)/.test(location.pathname) || sessionStorage.getItem("portfolio_dev_preview") === "1" || new URLSearchParams(location.search).has("dev");
export async function initializeMonitoring() {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN || privateRoute()) return;
  reporter = await import("@sentry/react");
  reporter.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE, sendDefaultPii: false, tracesSampleRate: 0, defaultIntegrations: false,
    beforeSend(event) {
      if (privateRoute()) return null;
      delete event.user; delete event.request; delete event.breadcrumbs; delete event.extra;
      for (const error of event.exception?.values || []) error.value = error.value?.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]").replace(/https?:\/\/\S+/g, "[url]");
      return event;
    },
  });
  window.addEventListener("error", e => reportError(e.error || new Error("Resource failed to load")));
  window.addEventListener("unhandledrejection", e => reportError(e.reason));
}
export function reportError(error: unknown) { if (!privateRoute()) reporter?.captureException(error); }
export function trackPage(path: string) {
  if (!import.meta.env.PROD || privateRoute() || navigator.doNotTrack === "1") return;
  (window as any).umami?.track((props: any) => ({ ...props, url: path, referrer: "", title: "Portfolio" }));
}
export function initializeAnalytics() {
  const src = import.meta.env.VITE_UMAMI_SCRIPT_URL; const id = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  if (!import.meta.env.PROD || privateRoute() || navigator.doNotTrack === "1" || !src || !id) return;
  try { if (new URL(src).protocol !== "https:") return; } catch { return; }
  const script = document.createElement("script"); script.src = src; script.defer = true;
  script.dataset.websiteId = id; script.dataset.autoTrack = "false"; script.dataset.doNotTrack = "true";
  script.onload = () => trackPage(location.pathname); document.head.append(script);
  document.addEventListener("click", event => {
    if (privateRoute()) return;
    const target = (event.target as Element)?.closest?.("a,button");
    const name = target?.id === "hero-download-cv-btn" ? "cv-download" : /^\/(?:en\/)?(?:project|projetos)\//.test(target?.getAttribute("href") || "") ? "project-open" : null;
    if (name) (window as any).umami?.track(name);
  });
}
