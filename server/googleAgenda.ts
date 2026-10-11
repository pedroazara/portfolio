import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Google Agenda no painel: "Entrar com Google" uma vez e o painel lê e cria
 * compromissos direto na agenda principal.
 *
 * Fluxo OAuth com código de autorização: `connect` devolve o endereço de
 * consentimento do Google; o Google volta para `/api/google-agenda-callback`,
 * que troca o código pelo refresh token e o guarda cifrado (AES-GCM, chave
 * derivada de GOOGLE_CLIENT_SECRET) num cookie HttpOnly deste site. Cada
 * chamada exige também uma sessão válida do painel (e, se ADMIN_USER_IDS
 * estiver definido, que seja de um desses usuários), então o cookie sozinho
 * não abre nada. Sem ADMIN_USER_IDS basta estar logado: o cookie só existe
 * no navegador de quem conectou a própria conta Google.
 *
 * Configuração na Vercel: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (passo a
 * passo em docs/google-agenda.md).
 */

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const TIME_ZONE = "America/Sao_Paulo";
const TOKEN_COOKIE = "painel_google";
const STATE_COOKIE = "painel_google_state";
const COOKIE_PATH = "/api";
const TOKEN_MAX_AGE = 400 * 24 * 60 * 60; // o máximo que os navegadores aceitam
const STATE_MAX_AGE = 10 * 60;
export const PANEL_PATH = "/admin/painel/meu-espaco?area=agenda";

class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

// ------------------------------------------------------------- cifra e assinatura

const keyFrom = (secret: string) => createHash("sha256").update(`painel-google:${secret}`).digest();

/** Cifra com AES-256-GCM; o resultado é `iv.tag.texto` em base64url. */
export function seal(text: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

export function unseal(sealed: string, secret: string): string | null {
  try {
    const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
    if (!iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function signState(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", keyFrom(secret)).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyState(state: string, secret: string): Record<string, unknown> | null {
  const [body, mac] = state.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", keyFrom(secret)).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- cookies e requisição

export function parseCookies(header = ""): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${encodeURIComponent(value)}; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

function origin(req: any): string {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  const proto = String(req.headers["x-forwarded-proto"] || (req.socket?.encrypted ? "https" : "http")).split(",")[0].trim();
  return `${proto}://${host}`;
}

export const redirectUri = (req: any) => process.env.GOOGLE_REDIRECT_URI?.trim() || `${origin(req)}/api/google-agenda-callback`;

function query(req: any): Record<string, string> {
  if (req.query && typeof req.query === "object") return req.query;
  return Object.fromEntries(new URL(req.url || "/", "http://local").searchParams);
}

async function requireAdmin(req: any): Promise<string> {
  const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || "")?.[1];
  if (!token) throw new HttpError(401, "Entre como administrador para ver a agenda.");
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/(rest|auth|storage)\/v1\/?$/, "");
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const allowed = (process.env.ADMIN_USER_IDS || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!url || !key) throw new HttpError(503, "Configure o Supabase no servidor.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Sessão inválida ou expirada.");
  if (allowed.length && !allowed.includes(data.user.id)) throw new HttpError(403, "Acesso restrito ao administrador.");
  return data.user.id;
}

// ------------------------------------------------------------- Google

async function googleJson(url: string, init: RequestInit = {}): Promise<any> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = body?.error?.message || body?.error_description || body?.error || `HTTP ${response.status}`;
    throw Object.assign(new Error(String(reason)), { status: response.status, code: body?.error });
  }
  return body;
}

async function accessToken(refreshToken: string, settings: { clientId: string; clientSecret: string }): Promise<string> {
  try {
    const body = await googleJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    return body.access_token;
  } catch (err: any) {
    // Acesso revogado, senha trocada ou token expirado: é preciso conectar de novo.
    if (err.code === "invalid_grant") throw new HttpError(401, "A conexão com o Google expirou. Conecte de novo.", { disconnected: true });
    throw err;
  }
}

export interface LiveEvent {
  id: string;
  title: string;
  /** `AAAA-MM-DD` em São Paulo. */
  day: string;
  allDay: boolean;
  /** `HH:MM`, nos eventos com horário. */
  start?: string;
  end?: string;
  place?: string;
  link?: string;
}

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function shiftDate(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/**
 * Um evento da API do Google no formato do painel. Eventos de dia inteiro que
 * duram vários dias viram um item por dia (dentro da janela pedida).
 */
export function normalizeEvent(event: any, from: string, to: string): LiveEvent[] {
  if (!event || event.status === "cancelled") return [];
  const declined = (event.attendees ?? []).some((person: any) => person.self && person.responseStatus === "declined");
  if (declined) return [];
  const base = {
    id: String(event.id),
    title: String(event.summary || "(sem título)"),
    place: event.location ? String(event.location) : undefined,
    link: event.htmlLink ? String(event.htmlLink) : undefined,
  };
  if (event.start?.date) {
    const items: LiveEvent[] = [];
    const last = event.end?.date ? shiftDate(event.end.date, -1) : event.start.date;
    for (let day = event.start.date; day <= last && items.length < 62; day = shiftDate(day, 1)) {
      if (day >= from && day <= to) items.push({ ...base, id: `${base.id}:${day}`, day, allDay: true });
    }
    return items;
  }
  if (!event.start?.dateTime) return [];
  const start = new Date(event.start.dateTime);
  const end = event.end?.dateTime ? new Date(event.end.dateTime) : undefined;
  const day = dayFormat.format(start);
  if (day < from || day > to) return [];
  return [{ ...base, day, allDay: false, start: timeFormat.format(start), end: end ? timeFormat.format(end) : undefined }];
}

export const newEventInput = z
  .object({
    title: z.string().trim().min(1).max(240),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    end: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    location: z.string().trim().max(500).optional(),
    details: z.string().trim().max(4000).optional(),
  })
  .strict();

/** Corpo do `events.insert`: sem início é dia inteiro; sem fim, dura 1 hora; fim antes do início vira o dia seguinte. */
export function eventBody(input: z.infer<typeof newEventInput>) {
  const extra = {
    summary: input.title,
    ...(input.location ? { location: input.location } : {}),
    ...(input.details ? { description: input.details } : {}),
  };
  if (!input.start) return { ...extra, start: { date: input.date }, end: { date: shiftDate(input.date, 1) } };
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  let endTime = input.end || "";
  let endDate = input.date;
  if (!endTime) {
    const total = minutes(input.start) + 60;
    endTime = `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${input.start.slice(3, 5)}`;
    if (total >= 24 * 60) endDate = shiftDate(input.date, 1);
  } else if (minutes(endTime) <= minutes(input.start)) {
    endDate = shiftDate(input.date, 1);
  }
  return {
    ...extra,
    start: { dateTime: `${input.date}T${input.start}:00`, timeZone: TIME_ZONE },
    end: { dateTime: `${endDate}T${endTime}:00`, timeZone: TIME_ZONE },
  };
}

const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

// ------------------------------------------------------------- rotas

function send(res: any, status: number, body: unknown, cookies: string[] = []) {
  res.setHeader("Cache-Control", "no-store");
  if (cookies.length) res.setHeader("Set-Cookie", cookies);
  return res.status(status).json(body);
}

/** `/api/google-agenda?action=status|connect|events|create|disconnect` */
export default async function googleAgenda(req: any, res: any) {
  const action = query(req).action;
  const settings = config();
  try {
    await requireAdmin(req);
    const refreshToken = settings ? unseal(parseCookies(req.headers.cookie)[TOKEN_COOKIE] || "", settings.clientSecret) : null;

    if (action === "status") {
      return send(res, 200, { configured: Boolean(settings), connected: Boolean(refreshToken) });
    }
    if (!settings) throw new HttpError(503, "A conexão com o Google ainda não foi configurada na Vercel.", { unconfigured: true });

    if (action === "connect") {
      if (req.method !== "POST") throw new HttpError(405, "Use POST.");
      const nonce = randomBytes(16).toString("base64url");
      const state = signState({ nonce, exp: Date.now() + STATE_MAX_AGE * 1000 }, settings.clientSecret);
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({
        client_id: settings.clientId,
        redirect_uri: redirectUri(req),
        response_type: "code",
        scope: GOOGLE_SCOPE,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
      }).toString();
      return send(res, 200, { url: url.toString() }, [cookie(STATE_COOKIE, nonce, STATE_MAX_AGE)]);
    }

    if (action === "disconnect") {
      if (req.method !== "POST") throw new HttpError(405, "Use POST.");
      if (refreshToken) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
          method: "POST",
          signal: AbortSignal.timeout(5000),
        }).catch(() => undefined);
      }
      return send(res, 200, { connected: false }, [cookie(TOKEN_COOKIE, "", 0)]);
    }

    if (!refreshToken) throw new HttpError(401, "Conecte o seu Google Agenda.", { disconnected: true });
    const token = await accessToken(refreshToken, settings);
    const auth = { Authorization: `Bearer ${token}` };

    if (action === "events") {
      const { from = "", to = "" } = query(req);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from || to > shiftDate(from, 62)) {
        throw new HttpError(400, "Período inválido.");
      }
      const url = new URL(CALENDAR);
      url.search = new URLSearchParams({
        // Um dia de folga nas pontas cobre qualquer fuso; o filtro por dia em São Paulo corta o excesso.
        timeMin: `${shiftDate(from, -1)}T00:00:00Z`,
        timeMax: `${shiftDate(to, 2)}T00:00:00Z`,
        singleEvents: "true",
        orderBy: "startTime",
        timeZone: TIME_ZONE,
        maxResults: "250",
      }).toString();
      const body = await googleJson(url.toString(), { headers: auth });
      const events = (body.items ?? []).flatMap((event: any) => normalizeEvent(event, from, to));
      events.sort((a: LiveEvent, b: LiveEvent) =>
        a.day !== b.day ? a.day.localeCompare(b.day) : a.allDay !== b.allDay ? (a.allDay ? -1 : 1) : (a.start ?? "").localeCompare(b.start ?? ""),
      );
      return send(res, 200, { events });
    }

    if (action === "create") {
      if (req.method !== "POST") throw new HttpError(405, "Use POST.");
      const input = newEventInput.safeParse(req.body);
      if (!input.success) throw new HttpError(400, "Compromisso inválido.");
      const created = await googleJson(CALENDAR, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(eventBody(input.data)),
      });
      const day = input.data.date;
      return send(res, 200, { event: normalizeEvent(created, day, shiftDate(day, 1))[0] ?? null });
    }

    throw new HttpError(404, "Ação desconhecida.");
  } catch (err: any) {
    if (err instanceof HttpError) {
      const cookies = err.extra.disconnected ? [cookie(TOKEN_COOKIE, "", 0)] : [];
      return send(res, err.status, { error: err.message, ...err.extra }, cookies);
    }
    console.error("google-agenda", action, err?.message || err);
    return send(res, 502, { error: "O Google Agenda não respondeu. Tente de novo em instantes." });
  }
}

/** `/api/google-agenda-callback`: o Google volta para cá depois do consentimento. */
export async function googleAgendaCallback(req: any, res: any) {
  const back = (result: "conectado" | "erro" | "cancelado") => {
    res.statusCode = 302;
    res.setHeader("Location", `${PANEL_PATH}&google=${result}`);
    res.setHeader("Cache-Control", "no-store");
    return res.end();
  };
  const settings = config();
  const { code, state, error } = query(req);
  const clearState = cookie(STATE_COOKIE, "", 0);
  if (!settings) return back("erro");
  if (error) {
    res.setHeader("Set-Cookie", [clearState]);
    return back("cancelado");
  }
  const payload = state ? verifyState(state, settings.clientSecret) : null;
  const nonce = parseCookies(req.headers.cookie)[STATE_COOKIE];
  if (!code || !payload || !nonce || payload.nonce !== nonce || Number(payload.exp) < Date.now()) {
    res.setHeader("Set-Cookie", [clearState]);
    return back("erro");
  }
  try {
    const tokens = await googleJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        redirect_uri: redirectUri(req),
        grant_type: "authorization_code",
      }),
    });
    if (!tokens.refresh_token) throw new Error("O Google não devolveu o refresh token.");
    res.setHeader("Set-Cookie", [clearState, cookie(TOKEN_COOKIE, seal(tokens.refresh_token, settings.clientSecret), TOKEN_MAX_AGE)]);
    return back("conectado");
  } catch (err: any) {
    console.error("google-agenda-callback", err?.message || err);
    res.setHeader("Set-Cookie", [clearState]);
    return back("erro");
  }
}
