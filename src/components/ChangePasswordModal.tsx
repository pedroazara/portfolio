import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, KeyRound, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { getAdminPassword, updateAdminPassword } from "../lib/firebaseService";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Prevent background scrolling
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError("Todos os campos são obrigatórios.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("A nova senha e a confirmação não coincidem.");
      return;
    }

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const dbPassword = await getAdminPassword();
      if (currentPassword !== dbPassword) {
        setError("A senha atual digitada está incorreta.");
        setIsLoading(false);
        return;
      }

      await updateAdminPassword(newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error(err);
      setError("Erro ao atualizar senha no Firestore. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setError("");
    setSuccess(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 overflow-y-auto no-print">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Container */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 focus:outline-hidden"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-3 shadow-xs">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold font-display text-slate-950 dark:text-white">
                  Alterar Senha do Painel
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-sans max-w-xs">
                  Defina uma nova senha forte para proteger o acesso de personalização do seu site.
                </p>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40"
                >
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                    Senha alterada com sucesso!
                  </span>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    A sua nova senha já está ativa para os próximos acessos.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 text-xs transition-colors cursor-pointer"
                  >
                    Ok, fechar
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

                  {/* Current Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      required
                      disabled={isLoading}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Sua senha de acesso atual"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2 pl-3 pr-3 text-sm font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-75"
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      required
                      disabled={isLoading}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2 pl-3 pr-3 text-sm font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-75"
                    />
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      required
                      disabled={isLoading}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2 pl-3 pr-3 text-sm font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-75"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-75"
                    >
                      {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {isLoading ? "Salvando..." : "Alterar Senha"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
