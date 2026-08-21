import React, { useState } from "react";
import { Languages, Sparkles, Loader2, CheckCircle2, AlertCircle, AlertTriangle, Circle } from "lucide-react";
import ConfirmModal from "../ConfirmModal";
import { ResumeData } from "../../types";
import { translateAllContent, TRANSLATE_ALL_STEPS, TranslateAllStep } from "../../lib/translator";

/**
 * Tradução em lote de tudo que tem versão em inglês.
 *
 * Era uma das cinco abas declaradas dentro de AdminManagementModal, um arquivo
 * de 1.239 linhas. Cada aba já vinha com as próprias propriedades — só faltava
 * dar a cada uma o seu arquivo.
 */
export default function TranslationTab({
  language,
  resumeData,
  onRestore,
}: {
  language: "pt" | "en";
  resumeData: ResumeData;
  onRestore: (data: ResumeData) => void;
}) {
  const t = (pt: string, en: string) => (language === "en" ? en : pt);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(TRANSLATE_ALL_STEPS.map((s) => s.key))
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<TranslateAllStep[]>([]);
  const [errors, setErrors] = useState<{ section: string; message: string }[]>([]);
  const [finished, setFinished] = useState(false);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedSteps = TRANSLATE_ALL_STEPS.filter((s) => selectedKeys.has(s.key));

  const handleRun = async () => {
    setIsRunning(true);
    setFinished(false);
    setErrors([]);
    setSteps(selectedSteps.map((s) => ({ ...s, status: "pending" })));

    const { data, errors: runErrors } = await translateAllContent(
      resumeData,
      (key, status, error) => {
        setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, status, error } : s)));
      },
      selectedKeys
    );

    onRestore(data);
    setErrors(runErrors);
    setIsRunning(false);
    setFinished(true);
  };

  const stepIcon = (status: TranslateAllStep["status"]) => {
    if (status === "done") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (status === "running") return <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />;
    if (status === "error") return <AlertCircle className="h-3.5 w-3.5 text-rose-500" />;
    return <Circle className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700" />;
  };

  return (
    <div>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400 font-sans">
        {t(
          "Traduz de uma vez os campos curtos do português para o inglês em todo o portfólio (perfil, formação, experiências, atividades, habilidades, cursos, e título/resumo de projetos e posts). Textos longos, como o corpo dos posts e a descrição detalhada dos projetos, continuam com o botão de traduzir de cada editor. Qualquer tradução em inglês já existente será substituída.",
          "Translates every short PT field across the portfolio into English in one go (profile, education, experience, activities, skills, courses, and project/post titles & summaries). Long-form text, like post bodies and detailed project descriptions, still use each editor's own translate button. Any existing English translation will be overwritten."
        )}
      </p>

      <div className="mb-4 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-500">
            {t("Seções a traduzir", "Sections to translate")}
          </span>
          <div className="flex gap-3 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setSelectedKeys(new Set(TRANSLATE_ALL_STEPS.map((s) => s.key)))}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {t("Todas", "All")}
            </button>
            <button
              type="button"
              onClick={() => setSelectedKeys(new Set())}
              className="text-slate-500 dark:text-slate-500 hover:underline cursor-pointer"
            >
              {t("Nenhuma", "None")}
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {TRANSLATE_ALL_STEPS.map((s) => (
            <label
              key={s.key}
              className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <input
                type="checkbox"
                checked={selectedKeys.has(s.key)}
                onChange={() => toggleKey(s.key)}
                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 dark:text-slate-200">{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isRunning || selectedSteps.length === 0}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-60"
      >
        {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-300" />}
        {isRunning
          ? t("Traduzindo…", "Translating…")
          : selectedSteps.length === TRANSLATE_ALL_STEPS.length
          ? t("Traduzir Tudo (PT → EN)", "Translate Everything (PT → EN)")
          : t(`Traduzir Selecionadas (${selectedSteps.length})`, `Translate Selected (${selectedSteps.length})`)}
      </button>

      {(isRunning || finished) && (
        <div className="mt-4 space-y-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3">
          {steps.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              {stepIcon(s.status)}
              <span
                className={
                  s.status === "error"
                    ? "text-rose-600 dark:text-rose-400"
                    : s.status === "done"
                    ? "text-slate-700 dark:text-slate-200"
                    : "text-slate-500 dark:text-slate-500"
                }
              >
                {s.label}
              </span>
              {s.status === "error" && s.error && (
                <span className="text-[10px] text-rose-500/80 truncate">— {s.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {finished && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-xs border font-sans ${
            errors.length === 0
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40"
              : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40"
          }`}
        >
          {errors.length === 0 ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>
            {errors.length === 0
              ? t("Tudo traduzido com sucesso!", "Everything translated successfully!")
              : t(
                  `${steps.length - errors.length}/${steps.length} seções traduzidas. ${errors.length} falharam e mantiveram o conteúdo anterior.`,
                  `${steps.length - errors.length}/${steps.length} sections translated. ${errors.length} failed and kept their previous content.`
                )}
          </span>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleRun}
        type="warning"
        title={t("Traduzir seções selecionadas e sobrescrever?", "Translate selected sections and overwrite?")}
        message={t(
          `Isso vai gerar uma nova tradução em inglês para as ${selectedSteps.length} seção(ões) marcada(s), substituindo qualquer tradução já existente nelas (inclusive as que você editou manualmente). As demais seções não são tocadas.`,
          `This will generate a fresh English translation for the ${selectedSteps.length} checked section(s), replacing any existing translation in them (including ones you edited by hand). Other sections are left untouched.`
        )}
        confirmText={t("Traduzir", "Translate")}
        cancelText={t("Cancelar", "Cancel")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Avançado (Exportar/Importar + Zona de Perigo)
// ---------------------------------------------------------------------------
