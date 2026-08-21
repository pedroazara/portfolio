import React from "react";
import { ArrowLeft, Save, FileEdit, Eye, PenTool, CircleDot, Link2, Check } from "lucide-react";
import { Language } from "../lib/translations";

export type EditorView = "edit" | "preview";

interface EditorActionRailProps {
  title: string;
  isDirty: boolean;
  /** Estado atual do item. Rascunho só aparece para quem edita. */
  isDraft: boolean;
  onBack: () => void;
  /** Salva mantendo (ou tornando) o item um rascunho. */
  onSaveDraft: () => void;
  /** Salva e publica. */
  onPublish: () => void;
  /** Modos oferecidos. Omitido, a alternância não aparece. */
  views?: EditorView[];
  view?: EditorView;
  onViewChange?: (view: EditorView) => void;
  /**
   * Copia o link que mostra este rascunho a quem ainda não pode vê-lo.
   * Omitido, o botão não aparece — item novo não tem endereço ainda.
   */
  onCopyPreviewLink?: () => void;
  /** Espaço para ações específicas de cada editor, como traduzir. */
  children?: React.ReactNode;
  language?: Language;
}

const VIEW_META: Record<EditorView, { icon: typeof PenTool; pt: string; en: string }> = {
  edit: { icon: PenTool, pt: "Escrever", en: "Write" },
  preview: { icon: Eye, pt: "Prévia", en: "Preview" },
};

/**
 * Coluna de ações dos editores.
 *
 * Fica fixa na lateral e acompanha a rolagem, para que salvar e publicar
 * estejam sempre a um clique — mesmo no fim de um texto longo. Em telas
 * estreitas ela vira uma barra no topo, já que não há largura sobrando.
 */
export default function EditorActionRail({
  title,
  isDirty,
  isDraft,
  onBack,
  onSaveDraft,
  onPublish,
  views,
  view,
  onViewChange,
  onCopyPreviewLink,
  children,
  language = "pt",
}: EditorActionRailProps) {
  const isEn = language === "en";
  const [copiado, setCopiado] = React.useState(false);

  const copiarPrevia = () => {
    onCopyPreviewLink?.();
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="sticky top-24 z-30 space-y-3 no-print max-lg:static max-lg:top-0">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isEn ? "Back" : "Voltar"}
        </button>

        <div className="px-2">
          <h1 className="font-display text-sm font-bold leading-snug text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
            <CircleDot
              className={`h-2.5 w-2.5 ${isDraft ? "text-amber-500" : "text-emerald-500"}`}
            />
            <span className={isDraft ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
              {isDraft ? (isEn ? "Draft" : "Rascunho") : (isEn ? "Published" : "Publicado")}
            </span>
          </p>
          {isDirty && (
            <p className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {isEn ? "Unsaved changes" : "Alterações não salvas"}
            </p>
          )}
        </div>

        {/* Alternância de visualização */}
        {views && views.length > 1 && view && onViewChange && (
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/80 lg:flex-col">
            {views.map((mode) => {
              const meta = VIEW_META[mode];
              const Icon = meta.icon;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewChange(mode)}
                  className={`flex flex-1 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                    view === mode
                      ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-950 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{isEn ? meta.en : meta.pt}</span>
                </button>
              );
            })}
          </div>
        )}

        {children}

        <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onPublish}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-indigo-700"
          >
            <Save className="h-3.5 w-3.5" />
            {isDraft ? (isEn ? "Publish" : "Publicar") : (isEn ? "Save" : "Salvar")}
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FileEdit className="h-3.5 w-3.5" />
            {isEn ? "Save as draft" : "Salvar rascunho"}
          </button>

          {isDraft && onCopyPreviewLink && (
            <button
              type="button"
              onClick={copiarPrevia}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-900/60 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
            >
              {copiado ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
              {copiado
                ? (isEn ? "Link copied" : "Link copiado")
                : (isEn ? "Copy preview link" : "Copiar link de prévia")}
            </button>
          )}

          <p className="px-1 text-[10px] leading-snug text-slate-500">
            {isEn
              ? "Drafts stay hidden from visitors — only you see them, in edit mode. The preview link shows this draft to whoever opens it."
              : "Rascunhos ficam invisíveis para os visitantes — só você os vê, no modo de edição. O link de prévia mostra este rascunho a quem o abrir."}
          </p>
        </div>
      </div>
    </div>
  );
}
