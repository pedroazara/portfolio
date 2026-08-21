import React, { useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { X, Lock, KeyRound, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { describeAuthError, login, requestPasswordReset } from "../lib/auth";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetFields = () => {
    setPassword("");
    setError("");
    setNotice("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Informe o e-mail e a senha de administrador.");
      return;
    }

    setIsLoading(true);
    setError("");
    setNotice("");

    try {
      await login(email, password);
      resetFields();
      onLoginSuccess();
      onClose();
    } catch (err) {
      console.warn("Falha de autenticação:", (err as { code?: string })?.code);
      setError(describeAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setError("Digite seu e-mail para receber o link de redefinição.");
      return;
    }

    setIsLoading(true);
    setError("");
    setNotice("");

    try {
      await requestPasswordReset(email);
      setNotice("Se este e-mail estiver cadastrado, o link de redefinição chegará em instantes.");
    } catch (err) {
      console.warn("Falha ao enviar redefinição:", (err as { code?: string })?.code);
      setError(describeAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    resetFields();
    onClose();
  };

  // Fecha com Escape enquanto o modal estiver aberto.
  useEscapeKey(isOpen, handleClose);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isLoading ? undefined : handleClose}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity"
        />

        {/* Modal body container */}
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 sm:p-8"
          >
            {/* Header */}
            <div className="absolute right-4 top-4">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                id="close-login-btn"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center">
              {/* Lock icon illustration */}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm shadow-indigo-100/50 dark:shadow-none">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Lock className="h-6 w-6" />}
              </div>

              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                Área de Administração
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-sans max-w-xs">
                Entre com sua conta de administrador para ativar o modo de edição do currículo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50 font-sans">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success / info notice */}
              {notice && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 font-sans">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{notice}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1">
                <label htmlFor="admin-email" className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 dark:text-slate-500 pointer-events-none">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="username"
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="seu@email.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2.5 pl-10 pr-3 text-sm font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-75"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="admin-password" className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isLoading}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 dark:text-slate-500 pointer-events-none">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-2.5 pl-10 pr-10 text-sm font-sans focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-75"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
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
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-colors cursor-pointer disabled:bg-indigo-500 disabled:opacity-75"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isLoading ? "Acessando..." : "Acessar Painel"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
