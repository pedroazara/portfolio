import React, { useState } from "react";
import { Sparkles, Loader2, Check, AlertCircle } from "lucide-react";

interface TranslateButtonProps {
  onTranslate: () => Promise<void>;
  label?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export default function TranslateButton({
  onTranslate,
  label = "Traduzir com Gemini AI",
  className = "",
  disabled = false,
  size = "sm",
}: TranslateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || disabled) return;

    setIsLoading(true);
    setSuccess(false);
    setErrorMsg(null);

    try {
      await onTranslate();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Falha na tradução");
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const py = size === "sm" ? "py-1.5 px-3 text-xs" : "py-2 px-4 text-sm";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200 cursor-pointer shadow-xs ${
          success
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white active:scale-98"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${py} ${className}`}
        title="Gera tradução automática em Inglês usando Gemini AI (editável)"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Traduzindo...</span>
          </>
        ) : success ? (
          <>
            <Check className="h-3.5 w-3.5" />
            <span>Traduzido com Sucesso!</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            <span>{label}</span>
          </>
        )}
      </button>

      {errorMsg && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md mt-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{errorMsg}</span>
        </span>
      )}
    </div>
  );
}
