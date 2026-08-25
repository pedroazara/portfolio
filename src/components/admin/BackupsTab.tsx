import React, { useEffect, useState } from "react";
import {
  History, FileJson, FileText, ShieldAlert, RotateCcw, Download, Upload,
  Loader2, AlertCircle, AlertTriangle, CheckCircle2, CloudOff, PlusCircle, Circle, Trash2,
} from "lucide-react";
import { ResumeData } from "../../types";
import { BackupEntry, listBackups, createManualBackup, deleteBackup } from "../../lib/backupService";
import {
  FullBackupEntry, listFullBackups, createFullBackup, downloadFullBackup, restoreFullBackup, deleteFullBackup,
} from "../../lib/fullBackupService";
import ConfirmModal from "../ConfirmModal";
import { Images } from "lucide-react";

/** Qual lista de cópias está à mostra. */
type BackupSubTab = "full" | "light";

/** Uma cópia específica, identificada para restaurar ou apagar. */
type BackupRef = { kind: "light"; entry: BackupEntry } | { kind: "full"; entry: FullBackupEntry };

/**
 * Cópias de segurança: as automáticas do conteúdo e as completas, que levam também as imagens.
 *
 * Era uma das cinco abas declaradas dentro de AdminManagementModal, um arquivo
 * de 1.239 linhas. Cada aba já vinha com as próprias propriedades — só faltava
 * dar a cada uma o seu arquivo.
 */
export default function BackupsTab({
  language,
  onRestore,
  resumeData,
}: {
  language: "pt" | "en";
  onRestore: (data: ResumeData) => void;
  resumeData: ResumeData;
}) {
  const t = (pt: string, en: string) => (language === "en" ? en : pt);

  const [subTab, setSubTab] = useState<BackupSubTab>("full");

  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [fullBackups, setFullBackups] = useState<FullBackupEntry[]>([]);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [isCreatingFull, setIsCreatingFull] = useState(false);
  const [fullProgress, setFullProgress] = useState("");
  const [downloadingFullName, setDownloadingFullName] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [restoringKey, setRestoringKey] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupRef | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BackupRef | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const loadBackups = async () => {
    setIsLoading(true);
    setError("");
    try {
      setBackups(await listBackups());
    } catch (err) {
      console.error("Erro ao listar backups:", err);
      setError(t("Não foi possível carregar o histórico de backups.", "Could not load backup history."));
    } finally {
      setIsLoading(false);
    }
  };

  const loadFullBackups = async () => {
    setIsLoadingFull(true);
    setError("");
    try {
      setFullBackups(await listFullBackups());
    } catch (err) {
      console.error("Erro ao listar backups completos:", err);
      setError(t("Não foi possível carregar os backups completos.", "Could not load full backups."));
    } finally {
      setIsLoadingFull(false);
    }
  };

  useEffect(() => {
    loadBackups();
    loadFullBackups();
  }, []);

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

  const handleCreateFullBackup = async () => {
    setIsCreatingFull(true);
    setError("");
    try {
      await createFullBackup(resumeData, setFullProgress);
      await loadFullBackups();
    } catch (err) {
      console.error("Erro ao criar backup completo:", err);
      setError(t("Não foi possível criar o backup completo agora.", "Could not create the full backup right now."));
    } finally {
      setIsCreatingFull(false);
      setFullProgress("");
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

  const handleDownloadFull = async (entry: FullBackupEntry) => {
    setDownloadingFullName(entry.name);
    setError("");
    try {
      const blob = await downloadFullBackup(entry.name);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = entry.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao baixar backup completo:", err);
      setError(t("Não foi possível baixar este backup.", "Could not download this backup."));
    } finally {
      setDownloadingFullName(null);
    }
  };

  const handleRestore = async (pending: BackupRef) => {
    const key = pending.kind === "light" ? `light-${pending.entry.id}` : `full-${pending.entry.name}`;
    setRestoringKey(key);
    setError("");
    try {
      // Guarda o estado atual antes de sobrescrever, para que a restauração
      // em si também seja reversível.
      await createManualBackup();

      if (pending.kind === "light") {
        onRestore(pending.entry.data);
      } else {
        const data = await restoreFullBackup(pending.entry.name, setFullProgress);
        onRestore(data);
      }
    } catch (err) {
      console.error("Erro ao restaurar backup:", err);
      setError(t("Não foi possível restaurar este backup.", "Could not restore this backup."));
    } finally {
      setRestoringKey(null);
      setFullProgress("");
      setPendingRestore(null);
    }
  };

  const handleDelete = async (pending: BackupRef) => {
    const key = pending.kind === "light" ? `light-${pending.entry.id}` : `full-${pending.entry.name}`;
    setDeletingKey(key);
    setError("");
    try {
      if (pending.kind === "light") {
        await deleteBackup(pending.entry.id);
        setBackups((prev) => prev.filter((b) => b.id !== pending.entry.id));
      } else {
        await deleteFullBackup(pending.entry.name);
        setFullBackups((prev) => prev.filter((b) => b.name !== pending.entry.name));
      }
    } catch (err) {
      console.error("Erro ao apagar backup:", err);
      setError(t("Não foi possível apagar este backup.", "Could not delete this backup."));
    } finally {
      setDeletingKey(null);
      setPendingDelete(null);
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
  const formatBytes = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

  return (
    <div>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400 font-sans">
        {subTab === "full"
          ? t(
              "Backup completo: conteúdo + todas as imagens num .zip. Criado ao logar (no máximo 1x/dia) e sob demanda.",
              "Full backup: content + every image in a .zip. Created on login (at most once a day) and on demand."
            )
          : t(
              "Snapshot leve, só do conteúdo. Um automático é guardado todo dia na nuvem via agendamento no banco.",
              "Lightweight, content-only snapshot. An automatic one is saved daily in the cloud via a database schedule."
            )}
      </p>

      {/* Sub-tabs */}
      <div className="mb-4 flex rounded-xl bg-slate-100 dark:bg-slate-800/70 p-1">
        <button
          type="button"
          onClick={() => setSubTab("full")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            subTab === "full"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          <Images className="h-3.5 w-3.5" />
          {t("Completo", "Full")}
        </button>
        <button
          type="button"
          onClick={() => setSubTab("light")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            subTab === "light"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          <FileJson className="h-3.5 w-3.5" />
          {t("Só conteúdo", "Content only")}
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50 font-sans">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {subTab === "full" ? (
        <>
          <button
            type="button"
            onClick={handleCreateFullBackup}
            disabled={isCreatingFull}
            className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 py-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isCreatingFull ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
            {isCreatingFull ? fullProgress || t("Criando…", "Creating…") : t("Criar backup completo agora", "Create full backup now")}
          </button>

          <div className="space-y-2">
            {isLoadingFull ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : fullBackups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-500 dark:text-slate-500">
                <CloudOff className="h-8 w-8" />
                <p className="text-xs max-w-xs">
                  {t(
                    "Nenhum backup completo ainda. Ele é criado automaticamente ao logar (1x/dia) ou você pode criar um agora.",
                    "No full backups yet. It's created automatically on login (once a day) or you can create one now."
                  )}
                </p>
              </div>
            ) : (
              fullBackups.map((entry) => {
                const key = `full-${entry.name}`;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 font-sans">
                          {entry.createdAt ? formatDate(entry.createdAt) : entry.name}
                        </span>
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                          .zip
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{formatBytes(entry.sizeBytes)}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadFull(entry)}
                        disabled={downloadingFullName === entry.name}
                        title={t("Baixar .zip", "Download .zip")} aria-label={t("Baixar .zip", "Download .zip")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {downloadingFullName === entry.name ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingRestore({ kind: "full", entry })}
                        disabled={restoringKey === key}
                        title={t("Restaurar esta versão", "Restore this version")} aria-label={t("Restaurar esta versão", "Restore this version")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {restoringKey === key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind: "full", entry })}
                        disabled={deletingKey === key}
                        title={t("Apagar backup", "Delete backup")} aria-label={t("Apagar backup", "Delete backup")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingKey === key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={isCreating}
            className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 py-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
            {isCreating ? t("Criando…", "Creating…") : t("Criar backup agora", "Create backup now")}
          </button>

          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : backups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-500 dark:text-slate-500">
                <CloudOff className="h-8 w-8" />
                <p className="text-xs max-w-xs">
                  {t(
                    "Nenhum backup ainda. O primeiro snapshot automático roda na próxima janela diária, ou crie um agora.",
                    "No backups yet. The first automatic snapshot runs in the next daily window, or create one now."
                  )}
                </p>
              </div>
            ) : (
              backups.map((entry) => {
                const key = `light-${entry.id}`;
                return (
                  <div
                    key={key}
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
                      <span className="text-[10px] font-mono text-slate-500">{approxSizeKb(entry.data)} KB</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownload(entry)}
                        title={t("Baixar como JSON", "Download as JSON")} aria-label={t("Baixar como JSON", "Download as JSON")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingRestore({ kind: "light", entry })}
                        disabled={restoringKey === key}
                        title={t("Restaurar esta versão", "Restore this version")} aria-label={t("Restaurar esta versão", "Restore this version")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {restoringKey === key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind: "light", entry })}
                        disabled={deletingKey === key}
                        title={t("Apagar backup", "Delete backup")} aria-label={t("Apagar backup", "Delete backup")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingKey === key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={pendingRestore !== null}
        onClose={() => setPendingRestore(null)}
        onConfirm={() => pendingRestore && handleRestore(pendingRestore)}
        type="warning"
        title={t("Restaurar este backup?", "Restore this backup?")}
        message={
          pendingRestore
            ? pendingRestore.kind === "full"
              ? t(
                  `Isso substituirá TODO o conteúdo e reenviará todas as imagens da versão de ${formatDate(pendingRestore.entry.createdAt)}. Pode levar um tempo. O estado atual será salvo como backup antes da restauração.`,
                  `This will overwrite ALL content and re-upload every image from the ${formatDate(pendingRestore.entry.createdAt)} version. This may take a while. The current state will be saved as a backup before restoring.`
                )
              : t(
                  `Isso substituirá TODO o conteúdo atual do portfólio pela versão de ${formatDate(pendingRestore.entry.createdAt)}. O estado atual será salvo como um backup manual antes da restauração.`,
                  `This will overwrite ALL current portfolio content with the version from ${formatDate(pendingRestore.entry.createdAt)}. The current state will be saved as a manual backup before restoring.`
                )
            : ""
        }
        confirmText={t("Restaurar", "Restore")}
        cancelText={t("Cancelar", "Cancel")}
      />

      <ConfirmModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
        type="danger"
        title={t("Apagar este backup?", "Delete this backup?")}
        message={
          pendingDelete
            ? pendingDelete.kind === "full"
              ? t(
                  `O arquivo .zip da versão de ${pendingDelete.entry.createdAt ? formatDate(pendingDelete.entry.createdAt) : pendingDelete.entry.name} será apagado da nuvem. Não dá para desfazer.`,
                  `The .zip file from the ${pendingDelete.entry.createdAt ? formatDate(pendingDelete.entry.createdAt) : pendingDelete.entry.name} version will be deleted from the cloud. This cannot be undone.`
                )
              : t(
                  `O snapshot de ${formatDate(pendingDelete.entry.createdAt)} será apagado. Não dá para desfazer.`,
                  `The ${formatDate(pendingDelete.entry.createdAt)} snapshot will be deleted. This cannot be undone.`
                )
            : ""
        }
        confirmText={t("Apagar", "Delete")}
        cancelText={t("Cancelar", "Cancel")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Segurança
// ---------------------------------------------------------------------------
