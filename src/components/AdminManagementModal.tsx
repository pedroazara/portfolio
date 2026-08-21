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
import BackupsTab from "./admin/BackupsTab";
import SecurityTab from "./admin/SecurityTab";
import MediaTab from "./admin/MediaTab";
import TranslationTab from "./admin/TranslationTab";
import AdvancedTab from "./admin/AdvancedTab";

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
                className="absolute top-4 right-4 z-10 rounded-full p-1.5 text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
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

