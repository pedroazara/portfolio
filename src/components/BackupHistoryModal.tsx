import React, { useEffect, useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { motion, AnimatePresence } from "motion/react";
import { X, History, RotateCcw, Download, Loader2, AlertCircle, CloudOff, PlusCircle } from "lucide-react";
import { ResumeData } from "../types";
import { BackupEntry, listBackups, createManualBackup } from "../lib/backupService";
import ConfirmModal from "./ConfirmModal";

interface BackupHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (data: ResumeData) => void;
  language?: "pt" | "en";
}

export default function BackupHistoryModal({
  isOpen,
  onClose,
  onRestore,
  language = "pt",
}: BackupHistoryModalProps) {
  useEscapeKey(isOpen, onClose);

  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupEntry | null>(null);

  const t = (pt: string, en: string) => (language === "en" ? en : pt);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const loadBackups = async () => {
    setIsLoading(true);
    setError("");
    try {
      const list = await listBackups();
      setBackups(list);
    } catch (err) {
      console.error("Erro ao listar backups:", err);
      setError(t("Não foi possível carregar o histórico de backups.", "Could not load backup history."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadBackups();
  }, [isOpen]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setError("");
    try {
      await createManualBackup();
      await loadBackups();
    } catch (err) {
      console.error("Erro ao criar backup manual:", err);
      setError(t("Não foi possível criar o backup agora.", "Could not create the backup right now."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = (entry: BackupEntry) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entry.data, null, 2));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", dataStr);
    const stamp = new Date(entry.createdAt).toISOString().slice(0, 16).replace(/[T:]/g, "-");
    anchor.setAttribute("download", `backup_portfolio_${stamp}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleRestore = async (entry: BackupEntry) => {
    setRestoringId(entry.id);
    setError("");
    try {
      // Guarda o estado atual antes de sobrescrever, para que a restauração
      // em si também seja reversível.
      await createManualBackup();
      onRestore(entry.data);
      onClose();
    } catch (err) {
      console.error("Erro ao restaurar backup:", err);
      setError(t("Não foi possível restaurar este backup.", "Could not restore this backup."));
    } finally {
      setRestoringId(null);
      setPendingRestore(null);
    }
  };

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(language === "en" ? "en-US" : "pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const approxSizeKb = (data: ResumeData) => Math.max(1, Math.round(JSON.stringify(data).length / 1024));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 overflow-y-auto no-print">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 focus:outline-hidden"
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-3 shadow-xs">
                  <History className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold font-display text-slate-950 dark:text-white">
                  {t("Histórico de Backups", "Backup History")}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-sans max-w-sm">
                  {t(
                    "Um snapshot automático é guardado todo dia na nuvem. Você pode restaurar qualquer versão anterior a qualquer momento.",
                    "An automatic snapshot is saved daily in the cloud. You can restore any earlier version at any time."
                  )}
                </p>
              </div>

              {error && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50 font-sans">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isCreating}
                className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 py-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                {isCreating ? t("Criando…", "Creating…") : t("Criar backup agora", "Create backup now")}
              </button>

              <div className="max-h-80 overflow-y-auto -mx-2 px-2 space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : backups.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400 dark:text-slate-500">
                    <CloudOff className="h-8 w-8" />
                    <p className="text-xs max-w-xs">
                      {t(
                        "Nenhum backup ainda. O primeiro snapshot automático roda na próxima janela diária, ou crie um agora.",
                        "No backups yet. The first automatic snapshot runs in the next daily window, or create one now."
                      )}
                    </p>
                  </div>
                ) : (
                  backups.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 font-sans">
                            {formatDate(entry.createdAt)}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                              entry.source === "manual"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            }`}
                          >
                            {entry.source === "manual" ? t("manual", "manual") : t("automático", "automatic")}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{approxSizeKb(entry.data)} KB</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownload(entry)}
                          title={t("Baixar como JSON", "Download as JSON")}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingRestore(entry)}
                          disabled={restoringId === entry.id}
                          title={t("Restaurar esta versão", "Restore this version")}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {restoringId === entry.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          <ConfirmModal
            isOpen={pendingRestore !== null}
            onClose={() => setPendingRestore(null)}
            onConfirm={() => pendingRestore && handleRestore(pendingRestore)}
            type="warning"
            title={t("Restaurar este backup?", "Restore this backup?")}
            message={
              pendingRestore
                ? t(
                    `Isso substituirá TODO o conteúdo atual do portfólio pela versão de ${formatDate(pendingRestore.createdAt)}. O estado atual será salvo como um backup manual antes da restauração.`,
                    `This will overwrite ALL current portfolio content with the version from ${formatDate(pendingRestore.createdAt)}. The current state will be saved as a manual backup before restoring.`
                  )
                : ""
            }
            confirmText={t("Restaurar", "Restore")}
            cancelText={t("Cancelar", "Cancel")}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
