import React, { useRef, useState } from "react";
import { X, Download, Upload } from "lucide-react";
import { createManualBackup } from "../../lib/backupService";
import { AlertTriangle, RotateCcw, ShieldAlert, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { ResumeData } from "../../types";
import ConfirmModal from "../ConfirmModal";

/**
 * Ações destrutivas: restaurar o modelo e apagar o conteúdo.
 *
 * Era uma das cinco abas declaradas dentro de AdminManagementModal, um arquivo
 * de 1.239 linhas. Cada aba já vinha com as próprias propriedades — só faltava
 * dar a cada uma o seu arquivo.
 */
export default function AdvancedTab({
  language,
  resumeData,
  onRestore,
  onResetToTemplate,
  onClearAll,
}: {
  language: "pt" | "en";
  resumeData: ResumeData;
  onRestore: (data: ResumeData) => void;
  onResetToTemplate: () => void;
  onClearAll: () => void;
}) {
  const t = (pt: string, en: string) => (language === "en" ? en : pt);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingJson, setPendingJson] = useState<ResumeData | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [importError, setImportError] = useState("");
  const [dangerAction, setDangerAction] = useState<"reset" | "clear" | null>(null);
  const [isProcessingDanger, setIsProcessingDanger] = useState(false);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resumeData, null, 2));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", dataStr);
    const userName = (resumeData.profile.name || "curriculo").toLowerCase().replace(/\s+/g, "_");
    anchor.setAttribute("download", `curriculo_portfolio_${userName}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

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
        } else {
          alert(t("Arquivo JSON inválido. Verifique o formato.", "Invalid JSON structure."));
        }
      } catch (err) {
        alert(t("Erro ao ler o arquivo JSON.", "Error reading JSON file."));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmImport = () => {
    if (confirmText.trim().toUpperCase() !== "CONFIRMAR") {
      setImportError(t("Digite 'CONFIRMAR' para prosseguir.", "Please type CONFIRMAR to proceed."));
      return;
    }
    if (pendingJson) {
      handleExportJSON();
      onRestore(pendingJson);
      setPendingJson(null);
    }
  };

  const handleConfirmDanger = async () => {
    if (!dangerAction) return;
    setIsProcessingDanger(true);
    try {
      await createManualBackup();
      if (dangerAction === "reset") onResetToTemplate();
      if (dangerAction === "clear") onClearAll();
    } catch (err) {
      console.error("Erro ao criar backup de segurança:", err);
    } finally {
      setIsProcessingDanger(false);
      setDangerAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-500 mb-2">
          {t("Cópia local (.json)", "Local copy (.json)")}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {t(
            "Além dos backups na nuvem, você pode salvar ou carregar um arquivo JSON local — útil para migrar de servidor ou guardar uma cópia fora do Supabase.",
            "Besides cloud backups, you can save or load a local JSON file — useful for migrating servers or keeping a copy outside Supabase."
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            {t("Exportar JSON", "Export JSON")}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            {t("Importar JSON", "Import JSON")}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-4">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400 mb-2">
          <ShieldAlert className="h-3.5 w-3.5" />
          {t("Zona de Perigo", "Danger Zone")}
        </h4>
        <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mb-3">
          {t(
            "Essas ações substituem todo o conteúdo do portfólio. Um backup do estado atual é criado automaticamente antes de aplicar.",
            "These actions overwrite all portfolio content. A backup of the current state is created automatically before applying."
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDangerAction("reset")}
            className="flex-1 rounded-xl border border-rose-300 dark:border-rose-800 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            {t("Restaurar modelo padrão", "Reset to template")}
          </button>
          <button
            type="button"
            onClick={() => setDangerAction("clear")}
            className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            {t("Limpar tudo", "Clear all")}
          </button>
        </div>
      </div>

      {/* Destructive import confirmation */}
      {pendingJson && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm text-slate-900 dark:text-white font-sans">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h3 className="text-base font-extrabold tracking-tight font-display">
                  {t("Atenção: Ação Destrutiva", "Destructive Import Warning")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingJson(null)}
                className="rounded p-1 text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t(
                "A importação deste arquivo substituirá TODO o conteúdo atual do portfólio. Um backup automático do estado atual será baixado para sua segurança.",
                "Importing this backup will overwrite ALL current content on your portfolio. An automatic backup of your current state will be downloaded before applying changes."
              )}
            </p>

            <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3 border border-rose-200/80 dark:border-rose-900/40">
              <label className="block text-[11px] font-bold text-rose-800 dark:text-rose-300">
                {t("Digite 'CONFIRMAR' para autorizar a importação:", "Type 'CONFIRMAR' to proceed:")}
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  setImportError("");
                }}
                placeholder="CONFIRMAR"
                className="mt-1.5 w-full rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              {importError && <p className="mt-1 text-[11px] text-rose-600 font-medium">{importError}</p>}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingJson(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t("Cancelar", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
              >
                {t("Importar e Sobrescrever", "Import and Overwrite")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={dangerAction !== null}
        onClose={() => (isProcessingDanger ? null : setDangerAction(null))}
        onConfirm={handleConfirmDanger}
        type="danger"
        title={
          dangerAction === "reset"
            ? t("Restaurar modelo padrão?", "Reset to template?")
            : t("Limpar todo o conteúdo?", "Clear all content?")
        }
        message={
          dangerAction === "reset"
            ? t(
                "Isso substituirá TODO o conteúdo atual pelo modelo padrão do portfólio. O estado atual será salvo como backup manual antes.",
                "This will overwrite ALL current content with the portfolio's default template. The current state will be saved as a manual backup first."
              )
            : t(
                "Isso apagará TODO o conteúdo do portfólio (perfil, projetos, experiências etc). O estado atual será salvo como backup manual antes.",
                "This will erase ALL portfolio content (profile, projects, experience, etc). The current state will be saved as a manual backup first."
              )
        }
        confirmText={t("Confirmar", "Confirm")}
        cancelText={t("Cancelar", "Cancel")}
      />
    </div>
  );
}
