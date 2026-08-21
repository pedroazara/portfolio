import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { KeyRound, Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { changePassword, describeAuthError, currentUser } from "../../lib/auth";

/**
 * Conta e senha de quem administra o site.
 *
 * Era uma das cinco abas declaradas dentro de AdminManagementModal, um arquivo
 * de 1.239 linhas. Cada aba já vinha com as próprias propriedades — só faltava
 * dar a cada uma o seu arquivo.
 */
export default function SecurityTab({ language }: { language: "pt" | "en" }) {
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
          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" />
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
