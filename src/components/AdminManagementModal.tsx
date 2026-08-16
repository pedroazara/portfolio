import React, { useEffect, useRef, useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Settings,
  History,
  KeyRound,
  Image as ImageIcon,
  Images,
  FileJson,
  FileText,
  ShieldAlert,
  RotateCcw,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  PlusCircle,
  Mail,
  Languages,
  Sparkles,
  Circle,
} from "lucide-react";
import { ResumeData } from "../types";
import { BackupEntry, listBackups, createManualBackup } from "../lib/backupService";
import {
  FullBackupEntry,
  listFullBackups,
  createFullBackup,
  downloadFullBackup,
  restoreFullBackup,
} from "../lib/fullBackupService";
import { changePassword, describeAuthError, currentUser } from "../lib/auth";
import { translateAllContent, TRANSLATE_ALL_STEPS, TranslateAllStep } from "../lib/translator";
import ConfirmModal from "./ConfirmModal";

type Tab = "backups" | "security" | "media" | "translation" | "advanced";

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
  onRestore: (data: ResumeData) => void;
  onResetToTemplate: () => void;
  onClearAll: () => void;
  onOpenImageBank: () => void;
  onOpenPdfPreview: () => void;
  language?: "pt" | "en";
}

export default function AdminManagementModal({
  isOpen,
  onClose,
  resumeData,
  onRestore,
  onResetToTemplate,
  onClearAll,
  onOpenImageBank,
  onOpenPdfPreview,
  language = "pt",
}: AdminManagementModalProps) {
  const [tab, setTab] = useState<Tab>("backups");
  useEscapeKey(isOpen, onClose);

  const t = (pt: string, en: string) => (language === "en" ? en : pt);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTab("backups");
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "backups", label: t("Backups", "Backups"), icon: History },
    { id: "security", label: t("Segurança", "Security"), icon: KeyRound },
    { id: "media", label: t("Mídia", "Media"), icon: ImageIcon },
    { id: "translation", label: t("Tradução", "Translation"), icon: Languages },
    { id: "advanced", label: t("Avançado", "Advanced"), icon: ShieldAlert },
  ];

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
              className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 focus:outline-hidden overflow-hidden"
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 rounded-full p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center px-6 pt-6 sm:px-8 sm:pt-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-3 shadow-xs">
                  <Settings className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold font-display text-slate-950 dark:text-white">
                  {t("Gerenciamento do Painel", "Panel Management")}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-sans max-w-sm">
                  {t(
                    "Backups, segurança, mídia e ferramentas avançadas do seu portfólio.",
                    "Backups, security, media and advanced tools for your portfolio."
                  )}
                </p>
              </div>

              {/* Tab nav */}
              <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-100 dark:border-slate-800 px-4 sm:px-8">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                      tab === id
                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-6 py-5 sm:px-8">
                {tab === "backups" && <BackupsTab language={language} onRestore={onRestore} resumeData={resumeData} />}
                {tab === "security" && <SecurityTab language={language} />}
                {tab === "media" && (
                  <MediaTab
                    language={language}
                    onOpenImageBank={() => {
                      onClose();
                      onOpenImageBank();
                    }}
                    onOpenPdfPreview={() => {
                      onClose();
                      onOpenPdfPreview();
                    }}
                  />
                )}
                {tab === "translation" && (
                  <TranslationTab language={language} resumeData={resumeData} onRestore={onRestore} />
                )}
                {tab === "advanced" && (
                  <AdvancedTab
                    language={language}
                    resumeData={resumeData}
                    onRestore={onRestore}
                    onResetToTemplate={onResetToTemplate}
                    onClearAll={onClearAll}
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Aba: Backups
// ---------------------------------------------------------------------------

type BackupSubTab = "full" | "light";
type PendingRestore = { kind: "light"; entry: BackupEntry } | { kind: "full"; entry: FullBackupEntry };

function BackupsTab({
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
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);

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

  const handleRestore = async (pending: PendingRestore) => {
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
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : fullBackups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400 dark:text-slate-500">
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
                      <span className="text-[10px] font-mono text-slate-400">{formatBytes(entry.sizeBytes)}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadFull(entry)}
                        disabled={downloadingFullName === entry.name}
                        title={t("Baixar .zip", "Download .zip")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
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
                        title={t("Restaurar esta versão", "Restore this version")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {restoringKey === key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
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
                        onClick={() => setPendingRestore({ kind: "light", entry })}
                        disabled={restoringKey === key}
                        title={t("Restaurar esta versão", "Restore this version")}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {restoringKey === key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Segurança
// ---------------------------------------------------------------------------

function SecurityTab({ language }: { language: "pt" | "en" }) {
  const t = (pt: string, en: string) => (language === "en" ? en : pt);

  const [email, setEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    currentUser().then((user) => setEmail(user?.email ?? null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError(t("Todos os campos são obrigatórios.", "All fields are required."));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t("A nova senha e a confirmação não coincidem.", "The new password and confirmation don't match."));
      return;
    }
    if (newPassword.length < 6) {
      setError(t("A nova senha deve ter pelo menos 6 caracteres.", "The new password must be at least 6 characters."));
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.warn("Falha ao alterar senha:", (err as { code?: string })?.code);
      setError(describeAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {email && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="font-mono truncate">{email}</span>
        </div>
      )}

      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40"
        >
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mb-2" />
          <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            {t("Senha alterada com sucesso!", "Password changed successfully!")}
          </span>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {t(
              "A sua nova senha já está ativa para os próximos acessos.",
              "Your new password is already active for the next logins."
            )}
          </p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 text-xs transition-colors cursor-pointer"
          >
            {t("Ok", "Ok")}
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50 font-sans">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
              {t("Senha Atual", "Current Password")}
            </label>
            <input
              type="password"
              required
              disabled={isLoading}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t("Sua senha de acesso atual", "Your current access password")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2 pl-3 pr-3 text-sm font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-75"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
              {t("Nova Senha", "New Password")}
            </label>
            <input
              type="password"
              required
              disabled={isLoading}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("Mínimo 6 caracteres", "Minimum 6 characters")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2 pl-3 pr-3 text-sm font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-75"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
              {t("Confirmar Nova Senha", "Confirm New Password")}
            </label>
            <input
              type="password"
              required
              disabled={isLoading}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder={t("Repita a nova senha", "Repeat the new password")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2 pl-3 pr-3 text-sm font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-75"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-75"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isLoading ? t("Salvando...", "Saving...") : t("Alterar Senha", "Change Password")}
          </button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Mídia
// ---------------------------------------------------------------------------

function MediaTab({
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

function TranslationTab({
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
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
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
              className="text-slate-400 dark:text-slate-500 hover:underline cursor-pointer"
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
                    : "text-slate-400 dark:text-slate-500"
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

function AdvancedTab({
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
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
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
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                className="mt-1.5 w-full rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
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
