import React, { useRef } from "react";
import { Eye, Edit3, Download, Upload, Lock, LogOut, Image as ImageIcon, FileText, KeyRound } from "lucide-react";
import { ResumeData } from "../types";
import { generateResumePDF } from "../utils/pdfGenerator";

interface PortfolioControlsProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onResetToTemplate: () => void;
  onClearAll: () => void;
  onImportJSON: (importedData: ResumeData) => void;
  resumeData: ResumeData;
  isAuthenticated: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  onOpenImageBank: () => void;
  onOpenChangePassword: () => void;
}

export default function PortfolioControls({
  isEditMode,
  onToggleEditMode,
  onResetToTemplate,
  onClearAll,
  onImportJSON,
  resumeData,
  isAuthenticated,
  onLoginClick,
  onLogout,
  onOpenImageBank,
  onOpenChangePassword,
}: PortfolioControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download entire state as JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resumeData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    
    // Use the user's name or fallback
    const userName = resumeData.profile.name.toLowerCase().replace(/\s+/g, "_") || "curriculo";
    downloadAnchor.setAttribute("download", `curriculo_portfolio_${userName}.json`);
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Upload JSON state
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Simple validation to ensure it matches the structure
        if (json && json.profile && json.categories && json.projects) {
          onImportJSON(json as ResumeData);
          alert("Currículo carregado com sucesso!");
        } else {
          alert("Arquivo JSON inválido. Verifique se o formato está correto.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = "";
  };

  const handlePrint = () => {
    generateResumePDF(resumeData).catch((err) => console.error("Erro ao gerar PDF:", err));
  };

  return (
    <div className="no-print print:hidden sticky top-4 z-40 mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95 p-4 sm:p-5 sm:px-6 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between transition-colors duration-300">
      {/* View vs Edit Mode Selectors */}
      <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 gap-1 self-start sm:self-auto">
        {!isAuthenticated ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-850 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xs">
            <Eye className="h-4 w-4 text-emerald-500" />
            <span>Modo Visualização (Público)</span>
          </div>
        ) : (
          <>
            <button
              onClick={() => {
                if (isEditMode) onToggleEditMode();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                !isEditMode
                  ? "bg-white dark:bg-slate-850 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              id="view-mode-toggle"
            >
              <Eye className="h-4 w-4" />
              Preview (Visitante)
            </button>
            <button
              onClick={() => {
                if (!isEditMode) onToggleEditMode();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isEditMode
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              id="edit-mode-toggle"
            >
              <Edit3 className="h-4 w-4" />
              Editar Conteúdo
            </button>
          </>
        )}
      </div>

      {/* Utility Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* PDF / Print Action */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 cursor-pointer"
          title="Baixar Currículo em formato PDF"
          id="print-resume-btn"
        >
          <FileText className="h-4 w-4 text-indigo-500" />
          <span>Baixar PDF</span>
        </button>

        {/* Authenticated Admin Actions */}
        {isAuthenticated && (
          <>
            {/* Export JSON */}
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              title="Exportar arquivo de backup"
              id="export-backup-btn"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar JSON</span>
            </button>

            {/* Import JSON */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
              id="import-backup-file-input"
            />
            <button
              onClick={handleImportClick}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              title="Importar arquivo de backup"
              id="import-backup-btn"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar JSON</span>
            </button>

            {/* Reset and Clear Actions only visible in Edit Mode */}
            {isEditMode && (
              <div className="flex flex-wrap items-center gap-2 sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-2">
                <button
                  type="button"
                  onClick={onOpenImageBank}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-800 dark:hover:text-indigo-200 cursor-pointer shadow-xs"
                  title="Abrir Banco de Imagens & Mídia"
                  id="image-bank-btn"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Banco de Imagens</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenChangePassword}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 transition-all hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-200 cursor-pointer shadow-xs"
                  title="Alterar Senha do Administrador"
                  id="change-password-btn"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Alterar Senha</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Lock/Unlock Authentication Trigger */}
        {!isAuthenticated ? (
          <button
            onClick={onLoginClick}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 dark:hover:bg-indigo-700 cursor-pointer"
            title="Acesso Administrador"
            id="admin-login-btn"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Painel</span>
          </button>
        ) : (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer"
            title="Encerrar Sessão Administrador"
            id="admin-logout-btn"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair</span>
          </button>
        )}
      </div>
    </div>
  );
}
