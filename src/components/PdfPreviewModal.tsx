import React, { useEffect, useState } from "react";
import { X, Download, FileText, ExternalLink, Loader2, Printer } from "lucide-react";
import { ResumeData } from "../types";
import { generateResumePDF, getResumePDFBlobUrl } from "../utils/pdfGenerator";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
  language?: "pt" | "en";
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  resumeData,
  language = "pt",
}: PdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      return;
    }

    setIsLoading(true);

    // A geração agora é assíncrona (o jsPDF é carregado sob demanda). O modal
    // pode fechar antes de ela terminar, então descartamos o resultado tardio
    // em vez de guardar uma URL que ninguém vai revogar.
    let url: string | null = null;
    let cancelled = false;

    getResumePDFBlobUrl(resumeData)
      .then((generated) => {
        if (cancelled) {
          if (generated) URL.revokeObjectURL(generated);
          return;
        }
        url = generated;
        setPdfUrl(generated);
      })
      .catch((err) => {
        console.error("Erro ao gerar preview do PDF:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [isOpen, resumeData]);

  if (!isOpen) return null;

  const handleDownload = () => {
    generateResumePDF(resumeData).catch((err) => {
      console.error("Erro ao baixar o PDF:", err);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-fadeIn">
      <div
        className="relative flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                {language === "en" ? "Curriculum PDF Preview" : "Pré-visualização do Currículo em PDF"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "en"
                  ? "Inspect your PDF document before saving to your device."
                  : "Confira o documento antes de realizar o download."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={language === "en" ? "Open in new tab" : "Abrir em nova aba"}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{language === "en" ? "New Tab" : "Nova Aba"}</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body / PDF Viewer */}
        <div className="relative flex-1 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs font-medium">
                {language === "en" ? "Generating PDF preview..." : "Gerando visualização do PDF..."}
              </p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="PDF Preview"
              className="h-full w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white shadow-inner"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-rose-500">
              <p className="text-sm font-semibold">
                {language === "en" ? "Failed to load PDF preview." : "Não foi possível carregar a visualização do PDF."}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {language === "en" ? "Close" : "Fechar"}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              const originalTitle = document.title;
              document.title = "Pedro-Henrique-Azara-de-Almeida-CV";
              window.print();
              setTimeout(() => {
                document.title = originalTitle;
              }, 1000);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>{language === "en" ? "Print (Save as PDF)" : "Imprimir (Salvar em PDF)"}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>{language === "en" ? "Download PDF File" : "Baixar Arquivo PDF"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
