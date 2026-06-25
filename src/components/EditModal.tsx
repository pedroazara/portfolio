import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
}

export default function EditModal({ isOpen, onClose, title, children, size = "md" }: EditModalProps) {
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

  const sizeClasses = {
    md: "max-w-xl",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
    "2xl": "max-w-4xl",
    "3xl": "max-w-5xl",
    "4xl": "max-w-6xl",
    "5xl": "max-w-7xl",
    full: "max-w-[95vw] md:max-w-[92vw]",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-print">
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
              className={`relative w-full ${sizeClasses[size]} rounded-2xl bg-white dark:bg-slate-900 p-7 shadow-2xl border border-slate-100 dark:border-slate-800 focus:outline-hidden`}
              id="edit-modal-content"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                <h3 className="text-lg font-bold font-display text-slate-950 dark:text-white">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  id="close-modal-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[80vh] overflow-y-auto pr-1">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
