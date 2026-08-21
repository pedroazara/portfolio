import React from "react";
import { Settings, LogOut } from "lucide-react";

interface AdminStripProps {
  isEditMode: boolean;
  onToggleEditMode: (editMode?: boolean) => void;
  isSaving: boolean;
  showSavedStatus?: boolean;
  showAutoSaveBanner?: boolean;
  onOpenManagement: () => void;
  onLogout: () => void;
  language?: "pt" | "en";
}

export default function AdminStrip({
  isEditMode,
  onToggleEditMode,
  isSaving,
  showSavedStatus = false,
  showAutoSaveBanner = false,
  onOpenManagement,
  onLogout,
  language = "pt",
}: AdminStripProps) {
  const isSavedVisible = showSavedStatus || showAutoSaveBanner;

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
                : "text-slate-500 hover:text-slate-200"
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
                : "text-slate-500 hover:text-slate-200"
            }`}
            id="admin-mode-edit"
          >
            {language === "en" ? "Edit" : "Editar"}
          </button>
        </div>
      </div>

      {/* Right: Save status, Manage, Logout */}
      <div className="flex items-center gap-3">
        {/* Save status in monospace (Hidden on mobile < 860px) */}
        <span className="hidden md:inline-block font-mono text-[11px] text-slate-500">
          {saveStatusText}
        </span>

        {/* Manage button */}
        <button
          type="button"
          onClick={onOpenManagement}
          className="flex h-7 w-7 items-center justify-center rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/50"
          aria-label={language === "en" ? "Panel management" : "Gerenciamento do painel"}
          title={language === "en" ? "Panel management" : "Gerenciamento do painel"}
          id="admin-management-btn"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1 text-slate-500 hover:text-white transition-colors cursor-pointer text-xs font-medium"
          id="admin-logout-btn"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{language === "en" ? "Logout" : "Sair"}</span>
        </button>
      </div>
    </div>
  );
}
