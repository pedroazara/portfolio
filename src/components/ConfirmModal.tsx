import React from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "danger",
}: ConfirmModalProps) {
  // Fecha com Escape enquanto o modal estiver aberto.
  useEscapeKey(isOpen, onClose);

  // Prevent body scroll when modal is open
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

  const colorClasses = {
    danger: {
      iconBg: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
      btnConfirm: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500",
    },
    warning: {
      iconBg: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
      btnConfirm: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500",
    },
    info: {
      iconBg: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400",
      btnConfirm: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs focus:ring-indigo-500",
    },
  };

  const selectedColor = colorClasses[type] || colorClasses.danger;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 overflow-y-auto no-print">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Container */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 focus:outline-hidden"
            >
              {/* Top Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-start gap-4 mt-2">
                {/* Icon Column */}
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selectedColor.iconBg}`}>
                  {type === "danger" ? (
                    <Trash2 className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>

                {/* Content Column */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold font-display text-slate-950 dark:text-white">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                    {message}
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                {cancelText && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${selectedColor.btnConfirm}`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
