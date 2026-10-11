import { isDevPreview } from "./devPreview";
import { isSupabaseConfigured, supabase } from "./supabase";
import {
  addDays,
  cardKey,
  scheduleReview,
  todayKey,
  type LanguageCard,
  type LanguageDay,
  type ReviewGrade,
} from "./languageCards";

export * from "./languageCards";

/**
 * Idiomas do painel (supabase/language_cards.sql): o baralho de flashcards e
 * os dias de estudo. Um agente acrescenta cartões novos de manhã pelo servidor
 * MCP `painel`; aqui você revisa, cria e apaga.
 *
 * No modo de prévia (`?dev`) tudo fica no localStorage deste navegador.
 */

const CARDS = "admin_language_cards";
const DAYS = "admin_language_days";
const CARD_COLUMNS =
  "id,lang,front,back,example,notes,source,due_on,interval_days,ease,reps,lapses,last_reviewed_at,created_at";

export class LanguageTablesUnavailableError extends Error {
  constructor() {
    super("As tabelas de idiomas ainda não existem. Rode supabase/language_cards.sql no SQL Editor do Supabase.");
  }
}

function tableError(message: string, code?: string): Error {
  return code === "42P01" || code === "PGRST205" ? new LanguageTablesUnavailableError() : new Error(message);
}

function assertConfigured() {
  if (!isSupabaseConfigured) throw new Error("Supabase não configurado — o painel pessoal precisa da nuvem.");
}

// ------------------------------------------------------------------ prévia

const PREVIEW_KEY = "portfolio_dev_language_cards";

interface PreviewStore {
  cards: LanguageCard[];
  days: LanguageDay[];
}

function sampleCard(front: string, back: string, example: string, notes: string | null = null): LanguageCard {
  return {
    id: crypto.randomUUID(),
    lang: "de",
    front,
    back,
    example,
    notes,
    source: "Prévia local",
    due_on: todayKey(),
    interval_days: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    last_reviewed_at: null,
    created_at: new Date().toISOString(),
  };
}

function readPreview(): PreviewStore {
  try {
    const raw = window.localStorage.getItem(PREVIEW_KEY);
    if (raw) return JSON.parse(raw) as PreviewStore;
  } catch {
    // Armazenamento danificado: recomeça com o exemplo.
  }
  return {
    cards: [
      sampleCard("der Tisch", "a mesa", "Das Buch liegt auf dem Tisch.", "Masculino: der Tisch, die Tische."),
      sampleCard("Guten Morgen!", "Bom dia!", "Guten Morgen, wie geht's?"),
      sampleCard("die Arbeit", "o trabalho", "Ich gehe zur Arbeit.", "Feminino: die Arbeit, die Arbeiten."),
    ],
    days: [{ lang: "de", day: addDays(todayKey(), -1), reviewed: 4, duolingo: true }],
  };
}

function writePreview(store: PreviewStore) {
  window.localStorage.setItem(PREVIEW_KEY, JSON.stringify(store));
}

// ----------------------------------------------------------------- cartões

export async function listLanguageCards(lang: string): Promise<LanguageCard[]> {
  if (isDevPreview()) return readPreview().cards.filter((card) => card.lang === lang);
  assertConfigured();
  const { data, error } = await supabase
    .from(CARDS)
    .select(CARD_COLUMNS)
    .eq("lang", lang)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw tableError(`Não foi possível carregar os cartões: ${error.message}`, error.code);
  return (data ?? []) as LanguageCard[];
}

export async function createLanguageCard(input: {
  lang: string;
  front: string;
  back: string;
  example?: string;
  notes?: string;
}): Promise<LanguageCard> {
  const row = {
    lang: input.lang,
    front: input.front.trim(),
    back: input.back.trim(),
    example: input.example?.trim() || null,
    notes: input.notes?.trim() || null,
    source: "Painel",
    due_on: todayKey(),
  };
  if (!row.front) throw new Error("Escreva a palavra ou frase.");
  if (isDevPreview()) {
    const store = readPreview();
    if (store.cards.some((card) => card.lang === row.lang && cardKey(card.front) === cardKey(row.front))) {
      throw new Error("Esse cartão já está no baralho.");
    }
    const card = { ...sampleCard(row.front, row.back, row.example ?? ""), ...row, source: "Painel" };
    store.cards.unshift(card);
    writePreview(store);
    return card;
  }
  assertConfigured();
  const { data, error } = await supabase.from(CARDS).insert(row).select(CARD_COLUMNS).single();
  if (error?.code === "23505") throw new Error("Esse cartão já está no baralho.");
  if (error) throw tableError(`Não foi possível criar o cartão: ${error.message}`, error.code);
  return data as LanguageCard;
}

export async function deleteLanguageCard(id: string): Promise<void> {
  if (isDevPreview()) {
    const store = readPreview();
    store.cards = store.cards.filter((card) => card.id !== id);
    return writePreview(store);
  }
  assertConfigured();
  const { error } = await supabase.from(CARDS).delete().eq("id", id);
  if (error) throw tableError(`Não foi possível apagar o cartão: ${error.message}`, error.code);
}

/** Grava a resposta: a nova agenda do cartão e +1 revisão no dia de hoje. */
export async function reviewLanguageCard(card: LanguageCard, grade: ReviewGrade): Promise<LanguageCard> {
  const today = todayKey();
  const updated: LanguageCard = {
    ...card,
    ...scheduleReview(card, grade, today),
    last_reviewed_at: new Date().toISOString(),
  };
  if (isDevPreview()) {
    const store = readPreview();
    store.cards = store.cards.map((item) => (item.id === card.id ? updated : item));
    const day = store.days.find((item) => item.lang === card.lang && item.day === today);
    if (day) day.reviewed += 1;
    else store.days.push({ lang: card.lang, day: today, reviewed: 1, duolingo: false });
    writePreview(store);
    return updated;
  }
  assertConfigured();
  const { due_on, interval_days, ease, reps, lapses, last_reviewed_at } = updated;
  const { error } = await supabase
    .from(CARDS)
    .update({ due_on, interval_days, ease, reps, lapses, last_reviewed_at })
    .eq("id", card.id);
  if (error) throw tableError(`Não foi possível salvar a revisão: ${error.message}`, error.code);
  await bumpReviewed(card.lang, today);
  return updated;
}

// ------------------------------------------------------------------- dias

export async function listLanguageDays(lang: string, sinceDay: string): Promise<LanguageDay[]> {
  if (isDevPreview()) return readPreview().days.filter((day) => day.lang === lang && day.day >= sinceDay);
  assertConfigured();
  const { data, error } = await supabase
    .from(DAYS)
    .select("lang,day,reviewed,duolingo")
    .eq("lang", lang)
    .gte("day", sinceDay)
    .order("day", { ascending: false });
  if (error) throw tableError(`Não foi possível carregar os dias de estudo: ${error.message}`, error.code);
  return (data ?? []) as LanguageDay[];
}

async function bumpReviewed(lang: string, day: string): Promise<void> {
  const { data } = await supabase.from(DAYS).select("reviewed").eq("lang", lang).eq("day", day).maybeSingle();
  const { error } = await supabase
    .from(DAYS)
    .upsert({ lang, day, reviewed: (data?.reviewed ?? 0) + 1, updated_at: new Date().toISOString() }, { onConflict: "lang,day" });
  // A revisão do cartão já foi salva; o contador do dia é secundário.
  if (error) console.warn("Contador de revisões do dia não foi salvo:", error.message);
}

export async function setDuolingoDone(lang: string, day: string, done: boolean): Promise<void> {
  if (isDevPreview()) {
    const store = readPreview();
    const entry = store.days.find((item) => item.lang === lang && item.day === day);
    if (entry) entry.duolingo = done;
    else store.days.push({ lang, day, reviewed: 0, duolingo: done });
    return writePreview(store);
  }
  assertConfigured();
  const { error } = await supabase
    .from(DAYS)
    .upsert({ lang, day, duolingo: done, updated_at: new Date().toISOString() }, { onConflict: "lang,day" });
  if (error) throw tableError(`Não foi possível marcar o Duolingo: ${error.message}`, error.code);
}
