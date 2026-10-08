import React from "react";
import { OrbitaIcon } from "./OrbitaIcon";

/** A mesma assinatura visual na navegação pública e no espaço pessoal. */
export default function PortfolioBrand({
  subtitle,
  compact = false,
  hideNameOnMobile = false,
}: {
  subtitle?: string;
  compact?: boolean;
  hideNameOnMobile?: boolean;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`portfolio-brand-mark flex shrink-0 items-center justify-center rounded-full bg-acento-solido p-0.5 text-white shadow-xs ${compact ? "h-10 w-10" : "h-11 w-11"}`}
      >
        <OrbitaIcon size={compact ? 34 : 38} color="#ffffff" />
      </span>
      <span
        className={`portfolio-brand-copy min-w-0 flex-col ${hideNameOnMobile ? "hidden sm:flex" : "flex"}`}
      >
        <span className="whitespace-nowrap font-display text-base font-bold tracking-tight text-tinta">
          Pedro Ázara
        </span>
        {subtitle && (
          <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium tracking-wide text-tinta-fraca">
            {subtitle}
          </span>
        )}
      </span>
    </>
  );
}
