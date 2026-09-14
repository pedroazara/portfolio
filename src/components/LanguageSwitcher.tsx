import { motion } from "motion/react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

/** Animate inside the control; shared layout coordinates include page scroll. */
export default function LanguageSwitcher({ language, onChange, mobile = false }: {
  language: "pt" | "en";
  onChange: (language: "pt" | "en") => void;
  mobile?: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div
      role="group"
      aria-label={language === "en" ? "Language" : "Idioma"}
      data-testid={mobile ? "language-mobile" : "language-desktop"}
      className={`relative grid-cols-2 rounded-lg border border-borda-forte bg-superficie-alta ${mobile ? "grid p-1" : "hidden p-0.5 min-[860px]:grid"}`}
    >
      <div aria-hidden="true" className={`pointer-events-none absolute ${mobile ? "inset-1" : "inset-0.5"}`}>
        <motion.span
          data-testid="language-indicator"
          initial={false}
          animate={{ x: language === "en" ? "100%" : "0%" }}
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 32, mass: 0.8 }}
          className="block h-full w-1/2 rounded-md bg-superficie shadow-xs"
        />
      </div>
      {(["pt", "en"] as const).map(value => (
        <button
          key={value}
          type="button"
          aria-pressed={language === value}
          aria-label={mobile ? undefined : value === "pt" ? "Mudar idioma para Português" : "Change language to English"}
          onClick={() => onChange(value)}
          className={`relative rounded-md text-xs font-bold transition-colors cursor-pointer ${mobile ? "px-3 py-1.5" : "px-2 py-1"} ${language === value ? "text-acento" : "text-tinta-fraca hover:text-tinta"}`}
        >
          {mobile ? value === "pt" ? "Português (PT)" : "English (EN)" : value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
