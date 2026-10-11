import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: async (token: string) =>
        token === "sessao-valida" ? { data: { user: { id: "admin" } }, error: null } : { data: { user: null }, error: new Error("inválida") },
    },
  }),
}));

const { default: googleAgenda, googleAgendaCallback } = await import("./googleAgenda");

function request(query: Record<string, string>, { method = "GET", cookie = "", body, auth = "sessao-valida" }: { method?: string; cookie?: string; body?: unknown; auth?: string } = {}) {
  return { method, query, body, headers: { host: "localhost:3000", authorization: auth ? `Bearer ${auth}` : "", cookie } };
}

function response() {
  const res: any = { statusCode: 200, headers: {} as Record<string, unknown>, body: undefined as any };
  res.setHeader = (name: string, value: unknown) => (res.headers[name.toLowerCase()] = value);
  res.status = (code: number) => ((res.statusCode = code), res);
  res.json = (body: unknown) => ((res.body = body), res);
  res.end = () => res;
  return res;
}

const cookieValue = (res: any, name: string) =>
  ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((item) => item.startsWith(`${name}=`))?.split(";")[0].slice(name.length + 1) ?? "";

const google = vi.fn();

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://exemplo.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("ADMIN_USER_IDS", "admin");
  vi.stubEnv("GOOGLE_CLIENT_ID", "cliente.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "segredo");
  google.mockReset();
  vi.stubGlobal("fetch", google);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function connected(): Promise<string> {
  const start = response();
  await googleAgenda(request({ action: "connect" }, { method: "POST" }), start);
  const state = new URL(start.body.url).searchParams.get("state")!;
  google.mockResolvedValueOnce(json({ access_token: "a", refresh_token: "rt-secreto" }));
  const back = response();
  await googleAgendaCallback(request({ code: "c", state }, { cookie: `painel_google_state=${cookieValue(start, "painel_google_state")}` }), back);
  return cookieValue(back, "painel_google");
}

describe("/api/google-agenda", () => {
  it("exige a sessão do painel", async () => {
    const res = response();
    await googleAgenda(request({ action: "status" }, { auth: "" }), res);
    expect(res.statusCode).toBe(401);
    const forged = response();
    await googleAgenda(request({ action: "status" }, { auth: "forjada" }), forged);
    expect(forged.statusCode).toBe(401);
  });

  it("diz quando falta configurar a chave do Google", async () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    const res = response();
    await googleAgenda(request({ action: "status" }), res);
    expect(res.body).toEqual({ configured: false, connected: false });
  });

  it("conecta pelo consentimento do Google e guarda o token cifrado", async () => {
    const start = response();
    await googleAgenda(request({ action: "connect" }, { method: "POST" }), start);
    const url = new URL(start.body.url);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/google-agenda-callback");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/calendar.events");

    const token = await connected();
    expect(token).not.toBe("");
    expect(decodeURIComponent(token)).not.toContain("rt-secreto");
    const status = response();
    await googleAgenda(request({ action: "status" }, { cookie: `painel_google=${token}` }), status);
    expect(status.body).toEqual({ configured: true, connected: true });
  });

  it("recusa a volta do Google com state de outra sessão", async () => {
    const start = response();
    await googleAgenda(request({ action: "connect" }, { method: "POST" }), start);
    const state = new URL(start.body.url).searchParams.get("state")!;
    const back = response();
    await googleAgendaCallback(request({ code: "c", state }, { cookie: "painel_google_state=outro" }), back);
    expect(back.statusCode).toBe(302);
    expect(back.headers.location).toBe("/admin/painel/meu-espaco?area=agenda&google=erro");
    expect(google).not.toHaveBeenCalled();
  });

  it("lê os eventos e cria compromissos", async () => {
    const token = await connected();
    google
      .mockResolvedValueOnce(json({ access_token: "acesso" }))
      .mockResolvedValueOnce(json({ items: [{ id: "e1", summary: "Aula", start: { dateTime: "2026-10-12T11:00:00Z" }, end: { dateTime: "2026-10-12T12:00:00Z" } }] }));
    const list = response();
    await googleAgenda(request({ action: "events", from: "2026-10-11", to: "2026-10-17" }, { cookie: `painel_google=${token}` }), list);
    expect(list.body.events).toEqual([expect.objectContaining({ id: "e1", title: "Aula", day: "2026-10-12", start: "08:00", end: "09:00" })]);
    expect(String(google.mock.calls.at(-1)?.[0])).toContain("singleEvents=true");

    google
      .mockResolvedValueOnce(json({ access_token: "acesso" }))
      .mockResolvedValueOnce(json({ id: "novo", summary: "Dentista", start: { date: "2026-10-13" }, end: { date: "2026-10-14" } }));
    const created = response();
    await googleAgenda(
      request({ action: "create" }, { method: "POST", cookie: `painel_google=${token}`, body: { title: "Dentista", date: "2026-10-13", start: "", end: "" } }),
      created,
    );
    expect(created.body.event).toMatchObject({ title: "Dentista", day: "2026-10-13", allDay: true });
    const sent = JSON.parse(String(google.mock.calls.at(-1)?.[1]?.body));
    expect(sent).toMatchObject({ summary: "Dentista", start: { date: "2026-10-13" }, end: { date: "2026-10-14" } });
  });

  it("pede para conectar de novo quando o Google revoga o acesso", async () => {
    const token = await connected();
    google.mockResolvedValueOnce(json({ error: "invalid_grant" }, 400));
    const res = response();
    await googleAgenda(request({ action: "events", from: "2026-10-11", to: "2026-10-17" }, { cookie: `painel_google=${token}` }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.disconnected).toBe(true);
    expect(cookieValue(res, "painel_google")).toBe("");
  });
});
