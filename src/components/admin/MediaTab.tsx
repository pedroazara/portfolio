import React from "react";
import { Images, ImageIcon, FileText } from "lucide-react";

/**
 * Atalhos para o banco de imagens e para a prévia do currículo em PDF.
 *
 * Era uma das cinco abas declaradas dentro de AdminManagementModal, um arquivo
 * de 1.239 linhas. Cada aba já vinha com as próprias propriedades — só faltava
 * dar a cada uma o seu arquivo.
 */
export default function MediaTab({
  language,
  onOpenImageBank,
  onOpenPdfPreview,
}: {
  language: "pt" | "en";
  onOpenImageBank: () => void;
  onOpenPdfPreview: () => void;
}) {
  const t = (pt: string, en: string) => (language === "en" ? en : pt);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onOpenImageBank}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
          <ImageIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("Banco de Imagens", "Image Bank")}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            {t("Envie, organize e recorte as imagens do portfólio.", "Upload, organize and crop your portfolio images.")}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={onOpenPdfPreview}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("Baixar CV (PDF)", "Download CV (PDF)")}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            {t("Pré-visualize e baixe o currículo em PDF.", "Preview and download the résumé as PDF.")}
          </span>
        </div>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Tradução
// ---------------------------------------------------------------------------
