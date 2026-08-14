import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Download, Upload, Image as ImageIcon, KeyRound, FileText, LogOut, AlertTriangle, X } from "lucide-react";
import { ResumeData } from "../types";
import { generateResumePDF } from "../utils/pdfGenerator";

interface AdminStripProps {
  isEditMode: boolean;
  onToggleEditMode: (editMode?: boolean) => void;
  isSaving: boolean;
  showSavedStatus?: boolean;
  showAutoSaveBanner?: boolean;
  resumeData: ResumeData;
  onImportJSON: (importedData: ResumeData) => void;
  onOpenImageBank: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
  onResetToTemplate?: () => void;
  onClearAll?: () => void;
  onOpenPdfPreview?: () => void;
  language?: "pt" | "en";
}

export default function AdminStrip({
  isEditMode,
  onToggleEditMode,
  isSaving,
  showSavedStatus = false,
  showAutoSaveBanner = false,
  resumeData,
  onImportJSON,
  onOpenImageBank,
  onOpenChangePassword,
  onLogout,
  onOpenPdfPreview,
  language = "pt",
}: AdminStripProps) {
  const isSavedVisible = showSavedStatus || showAutoSaveBanner;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pendingJson, setPendingJson] = useState<ResumeData | null>(null);
  const [importError, setImportError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setIsImportModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Export JSON backup
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resumeData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    const userName = (resumeData.profile.name || "curriculo").toLowerCase().replace(/\s+/g, "_");
    downloadAnchor.setAttribute("download", `curriculo_portfolio_${userName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsMenuOpen(false);
  };

  // Trigger file selection for import
  const handleImportClick = () => {
    fileInputRef.current?.click();
    setIsMenuOpen(false);
  };

  // File chosen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.profile && Array.isArray(json.projects)) {
          setPendingJson(json as ResumeData);
          setConfirmText("");
          setImportError("");
          setIsImportModalOpen(true);
        } else {
          alert(language === "en" ? "Invalid JSON structure." : "Arquivo JSON inválido. Verifique o formato.");
        }
      } catch (err) {
        alert(language === "en" ? "Error reading JSON file." : "Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Confirm destructive import
  const handleConfirmImport = () => {
    if (confirmText.trim().toUpperCase() !== "CONFIRMAR") {
      setImportError(language === "en" ? "Please type CONFIRMAR to proceed." : "Digite 'CONFIRMAR' para prosseguir.");
      return;
    }
    if (pendingJson) {
      // 1. Auto-export current state before overwriting
      handleExportJSON();
      // 2. Apply imported content
      onImportJSON(pendingJson);
      setIsImportModalOpen(false);
      setPendingJson(null);
    }
  };

  const handleDownloadPDF = () => {
    setIsMenuOpen(false);
    if (onOpenPdfPreview) {
      onOpenPdfPreview();
    } else {
      generateResumePDF(resumeData).catch((err) => console.error("Erro ao gerar PDF:", err));
    }
  };

  const saveStatusText = isSaving
    ? (language === "en" ? "saving..." : "salvando…")
    : isSavedVisible
    ? (language === "en" ? "saved just now" : "salvo agora")
    : (language === "en" ? "all saved" : "sincronizado");

  return (
    <div
      className="no-print print:hidden sticky top-0 z-50 flex h-[40px] w-full items-center justify-between bg-[#1c2333] px-3 sm:px-6 text-white border-b-2 border-[var(--accent)] font-sans text-xs select-none"
      role="banner"
      aria-label="Faixa de administração"
    >
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
        id="admin-import-file-input"
      />

      {/* Left: Badge ADMIN + Segmented Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* ADMIN Badge */}
        <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-white">
          ADMIN
        </span>

        {/* Segmented Control */}
        <div className="flex rounded bg-slate-800/80 p-0.5 border border-slate-700/60">
          <button
            type="button"
            onClick={() => onToggleEditMode(false)}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
              !isEditMode
                ? "bg-slate-700 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="admin-mode-preview"
          >
            {language === "en" ? "Preview" : "Pré-visualizar"}
          </button>
          <button
            type="button"
            onClick={() => onToggleEditMode(true)}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
              isEditMode
                ? "bg-[var(--accent)] text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
            id="admin-mode-edit"
          >
            {language === "en" ? "Edit" : "Editar"}
          </button>
        </div>
      </div>

      {/* Right: Save status, Menu ..., Logout */}
      <div className="flex items-center gap-3">
        {/* Save status in monospace (Hidden on mobile < 860px) */}
        <span className="hidden md:inline-block font-mono text-[11px] text-slate-400">
          {saveStatusText}
        </span>

        {/* Dropdown Menu `···` */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-7 w-7 items-center justify-center rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/50"
            aria-label="Menu de operações de dados"
            aria-expanded={isMenuOpen}
            id="admin-options-menu-btn"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-9 z-50 w-56 rounded-lg border border-slate-700 bg-[#1c2333] p-1.5 shadow-2xl text-xs text-slate-200 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Mobile-only save status inside menu */}
              <div className="md:hidden px-3 py-1.5 font-mono text-[10px] text-slate-400 border-b border-slate-700/60 mb-1">
                {saveStatusText}
              </div>

              <button
                type="button"
                onClick={handleExportJSON}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  <span>{language === "en" ? "Export Content" : "Exportar conteúdo"}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">.json</span>
              </button>

              <div className="my-1 border-t border-slate-700/60" />

              <button
                type="button"
                onClick={handleImportClick}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-3.5 w-3.5 text-rose-400" />
                  <span>{language === "en" ? "Import Content" : "Importar conteúdo"}</span>
                </div>
                <span className="font-mono text-[10px] text-rose-500/80">
                  {language === "en" ? "overwrites" : "sobrescreve"}
                </span>
              </button>

              <div className="my-1 border-t border-slate-700/60" />

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenImageBank();
                }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
                <span>{language === "en" ? "Image Bank" : "Banco de Imagens"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenChangePassword();
                }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                <span>{language === "en" ? "Change Password" : "Alterar Senha"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <span>{language === "en" ? "Download CV (PDF)" : "Baixar CV (PDF)"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-medium"
          id="admin-logout-btn"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{language === "en" ? "Logout" : "Sair"}</span>
        </button>
      </div>

      {/* Confirmation Modal for Destructive Import */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm text-slate-900 dark:text-white font-sans">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h3 className="text-base font-extrabold tracking-tight font-display">
                  {language === "en" ? "Destructive Import Warning" : "Atenção: Ação Destrutiva"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === "en"
                ? "Importing this backup will overwrite ALL current content on your portfolio. An automatic backup of your current state will be downloaded before applying changes."
                : "A importação deste arquivo substituirá TODO o conteúdo atual do portfólio. Um backup automático do estado atual será baixado para sua segurança."}
            </p>

            <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3 border border-rose-200/80 dark:border-rose-900/40">
              <label className="block text-[11px] font-bold text-rose-800 dark:text-rose-300">
                {language === "en"
                  ? "Type 'CONFIRMAR' to proceed:"
                  : "Digite 'CONFIRMAR' para autorizar a importação:"}
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  setImportError("");
                }}
                placeholder="CONFIRMAR"
                className="mt-1.5 w-full rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              {importError && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">{importError}</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {language === "en" ? "Cancel" : "Cancelar"}
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
              >
                {language === "en" ? "Import and Overwrite" : "Importar e Sobrescrever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
