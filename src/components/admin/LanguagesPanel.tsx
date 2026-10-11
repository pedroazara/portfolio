import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, Flame, Layers, Loader2, Plus, RefreshCw, Search, Trash2, Volume2 } from "lucide-react";
import ConfirmModal from "../ConfirmModal";
import {
  LANGUAGES,
  addDays,
  createLanguageCard,
  deleteLanguageCard,
  dueCards,
  listLanguageCards,
  listLanguageDays,
  previewInterval,
  reviewLanguageCard,
  setDuolingoDone,
  studyStreak,
  todayKey,
  type LanguageCard,
  type LanguageDay,
  type ReviewGrade,
} from "../../lib/languageCardsService";

/**
 * Aba "Idiomas" do painel: flashcards com revisão espaçada, começando pelo
 * alemão. Um agente acrescenta cartões novos toda manhã (servidor MCP
 * `painel`, ferramenta add_language_cards); aqui você revisa, ouve a pronúncia
 * pela voz do navegador e marca o Duolingo do dia, que conta na sequência.
 *
 * Atalhos na revisão: espaço mostra a resposta; 1, 2 e 3 respondem.
 */

const LANG = "de";

const GRADES: { grade: ReviewGrade; label: string; key: string; className: string }[] = [
  { grade: "again", label: "Errei", key: "1", className: "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40" },
  { grade: "hard", label: "Difícil", key: "2", className: "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40" },
  { grade: "easy", label: "Fácil", key: "3", className: "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40" },
];

function speak(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANGUAGES[lang]?.speech ?? lang;
  const voice = synth.getVoices().find((item) => item.lang.toLowerCase().startsWith(lang));
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9;
  synth.speak(utterance);
}

function SpeakButton({ text, label }: { text: string; label: string }) {
  if (typeof window !== "undefined" && !("speechSynthesis" in window)) return null;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        speak(text, LANG);
      }}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
    >
      <Volume2 className="h-4 w-4" />
    </button>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function formatDue(day: string, today: string): string {
  if (day <= today) return "hoje";
  if (day === addDays(today, 1)) return "amanhã";
  return new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export default function LanguagesPanel() {
  const [cards, setCards] = useState<LanguageCard[]>([]);
  const [days, setDays] = useState<LanguageDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Fila da sessão: os vencidos ao abrir; quem você erra volta para o fim.
  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewedNow, setReviewedNow] = useState(0);
  const [draft, setDraft] = useState({ front: "", back: "", example: "", notes: "" });
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<LanguageCard | null>(null);
  const today = todayKey();
  const language = LANGUAGES[LANG];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cardList, dayList] = await Promise.all([
        listLanguageCards(LANG),
        listLanguageDays(LANG, addDays(todayKey(), -400)),
      ]);
      setCards(cardList);
      setDays(dayList);
      setQueue(dueCards(cardList, todayKey()).map((card) => card.id));
      setRevealed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const current = queue.length ? byId.get(queue[0]) ?? null : null;
  const todayEntry = days.find((day) => day.day === today);
  const streak = studyStreak(days, today);
  const dueCount = new Set(queue).size;

  const answer = useCallback(
    async (grade: ReviewGrade) => {
      if (!current || saving) return;
      setSaving(true);
      setError("");
      try {
        const updated = await reviewLanguageCard(current, grade);
        setCards((list) => list.map((card) => (card.id === updated.id ? updated : card)));
        setQueue((list) => (grade === "again" ? [...list.slice(1), current.id] : list.slice(1)));
        setDays((list) => {
          const entry = list.find((day) => day.day === today);
          if (entry) return list.map((day) => (day === entry ? { ...day, reviewed: day.reviewed + 1 } : day));
          return [{ lang: LANG, day: today, reviewed: 1, duolingo: false }, ...list];
        });
        setReviewedNow((count) => count + 1);
        setRevealed(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [current, saving, today],
  );

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [contenteditable='true']") || event.metaKey || event.ctrlKey)) return;
      if (event.key === " " && !revealed) {
        event.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const match = GRADES.find((item) => item.key === event.key);
        if (match) {
          event.preventDefault();
          void answer(match.grade);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, revealed, answer]);

  const toggleDuolingo = async () => {
    const done = !todayEntry?.duolingo;
    setError("");
    try {
      await setDuolingoDone(LANG, today, done);
      setDays((list) =>
        todayEntry
          ? list.map((day) => (day === todayEntry ? { ...day, duolingo: done } : day))
          : [{ lang: LANG, day: today, reviewed: 0, duolingo: done }, ...list],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const addCard = async (event: React.FormEvent) => {
    event.preventDefault();
    if (adding) return;
    setAdding(true);
    setError("");
    try {
      const card = await createLanguageCard({ lang: LANG, ...draft });
      setCards((list) => [card, ...list]);
      setQueue((list) => [...list, card.id]);
      setDraft({ front: "", back: "", example: "", notes: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    const card = pendingDelete;
    setPendingDelete(null);
    if (!card) return;
    try {
      await deleteLanguageCard(card.id);
      setCards((list) => list.filter((item) => item.id !== card.id));
      setQueue((list) => list.filter((id) => id !== card.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter((card) => `${card.front} ${card.back} ${card.example ?? ""}`.toLowerCase().includes(term));
  }, [cards, query]);

  if (loading && !cards.length) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando o baralho…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {language.flag} {language.label}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Revise os cartões do dia. Os novos chegam toda manhã junto com a mini-aula em Atualizações.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Eye} label="Para revisar" value={dueCount} />
        <Stat icon={Layers} label="No baralho" value={cards.length} />
        <Stat icon={Flame} label="Sequência" value={streak === 1 ? "1 dia" : `${streak} dias`} />
        <button
          type="button"
          onClick={() => void toggleDuolingo()}
          aria-pressed={Boolean(todayEntry?.duolingo)}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
            todayEntry?.duolingo
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
              : "border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              todayEntry?.duolingo ? "bg-emerald-500 text-white" : "border-2 border-dashed border-slate-300 text-transparent dark:border-slate-600"
            }`}
          >
            <Check className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Duolingo hoje</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{todayEntry?.duolingo ? "Feito" : "Marcar como feito"}</p>
          </div>
        </button>
      </div>

      <section aria-label="Revisão" className="max-w-3xl">
        {current ? (
          <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm ring-4 ring-indigo-500/5 dark:border-indigo-900/70 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {dueCount === 1 ? "Último cartão" : `${dueCount} cartões restantes`}
                {current.reps === 0 && current.lapses === 0 && (
                  <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                    Novo
                  </span>
                )}
              </span>
              <SpeakButton text={current.front} label="Ouvir a pronúncia" />
            </div>
            <p lang={LANG} className="mt-4 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {current.front}
            </p>

            {revealed ? (
              <>
                <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-center dark:border-slate-800">
                  <p className="text-xl font-semibold text-indigo-700 dark:text-indigo-300">{current.back}</p>
                  {current.example && (
                    <p className="flex items-center justify-center gap-2 text-sm italic text-slate-600 dark:text-slate-300">
                      <span lang={LANG}>{current.example}</span>
                      <SpeakButton text={current.example} label="Ouvir o exemplo" />
                    </p>
                  )}
                  {current.notes && <p className="text-sm text-slate-500 dark:text-slate-400">{current.notes}</p>}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {GRADES.map(({ grade, label, key, className }) => (
                    <button
                      key={grade}
                      type="button"
                      disabled={saving}
                      onClick={() => void answer(grade)}
                      className={`rounded-xl border bg-white px-3 py-3 text-sm font-semibold transition disabled:opacity-60 dark:bg-slate-900 ${className}`}
                    >
                      {label}
                      <span className="mt-0.5 block text-[11px] font-normal opacity-70">
                        {previewInterval(current, grade)} · tecla {key}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Mostrar resposta <span className="font-normal opacity-70">· espaço</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40">
              <Check className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white">
              {cards.length ? "Tudo revisado por hoje." : "O baralho ainda está vazio."}
            </h4>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
              {cards.length
                ? reviewedNow
                  ? `Você revisou ${reviewedNow} ${reviewedNow === 1 ? "cartão" : "cartões"} agora. Bis morgen!`
                  : "Volte amanhã para os próximos cartões."
                : "Os primeiros cartões chegam com a mini-aula da manhã, ou crie um aqui embaixo."}
            </p>
          </div>
        )}
      </section>

      <section aria-label="Novo cartão" className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Novo cartão</h3>
        <form onSubmit={addCard} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            className={inputClass}
            lang={LANG}
            placeholder="Em alemão (ex.: der Tisch)"
            value={draft.front}
            onChange={(event) => setDraft({ ...draft, front: event.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="Em português (ex.: a mesa)"
            value={draft.back}
            onChange={(event) => setDraft({ ...draft, back: event.target.value })}
            required
          />
          <input
            className={inputClass}
            lang={LANG}
            placeholder="Frase de exemplo (opcional)"
            value={draft.example}
            onChange={(event) => setDraft({ ...draft, example: event.target.value })}
          />
          <input
            className={inputClass}
            placeholder="Observação (opcional)"
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          />
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar ao baralho
          </button>
        </form>
      </section>

      {cards.length > 0 && (
        <section aria-label="Baralho" className="max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Baralho · {cards.length}</h3>
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Buscar no baralho"
                placeholder="Buscar"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`${inputClass} w-56 pl-9`}
              />
            </label>
          </div>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {filtered.map((card) => (
              <li key={card.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p lang={LANG} className="truncate text-sm font-semibold text-slate-900 dark:text-white">{card.front}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{card.back}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">revisar {formatDue(card.due_on, today)}</span>
                <SpeakButton text={card.front} label={`Ouvir "${card.front}"`} />
                <button
                  type="button"
                  onClick={() => setPendingDelete(card)}
                  aria-label={`Apagar "${card.front}"`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {!filtered.length && <li className="px-4 py-6 text-center text-sm text-slate-400">Nenhum cartão encontrado.</li>}
          </ul>
        </section>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Apagar cartão"
        message={`“${pendingDelete?.front}” sai do baralho, junto com o histórico de revisões dele.`}
        confirmText="Apagar"
      />
    </div>
  );
}
