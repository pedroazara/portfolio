import React from "react";
import { Language } from "../lib/translations";

export type PitchAccent = "azul" | "verde" | "dourado" | "cnpem";
export const ACCENT_SOLIDO: Record<PitchAccent, string> = {
  azul: "bg-slate-700", verde: "bg-slate-700", dourado: "bg-slate-700", cnpem: "bg-slate-700",
};
interface PitchSlideCanvasProps {
  title: string;
  children: React.ReactNode;
  accent: PitchAccent;
  numero: number;
  fill?: boolean;
  language?: Language;
}

/** Moldura institucional consistente em todos os slides e temas do site. */
export default function PitchSlideCanvas({ title, children, numero, fill = false }: PitchSlideCanvasProps) {
  return (
    <div data-pitch-slide={numero} className="pitch-slide relative flex h-full flex-col overflow-hidden rounded-lg bg-[#102536] px-6 py-5 text-white sm:px-12 sm:py-7">
      <header className="relative mb-6 flex shrink-0 items-center justify-between border-b border-white/15 pb-4">
        <img src="/brand/ufla-logo-white.png" alt="UFLA" width={400} height={198} className="h-auto w-20 shrink-0 object-contain sm:w-24" />
        <img src="/brand/cnpem-white.png" alt="CNPEM" width={199} height={103} className="h-auto w-20 shrink-0 object-contain sm:w-24" />
      </header>
      {title && <h2 className="relative shrink-0 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.65rem]">{title}</h2>}
      <div className={`relative min-h-0 flex-1 ${title ? "mt-6" : ""} ${fill ? "overflow-hidden" : "overflow-y-auto"}`}>
        {children}
      </div>
      <footer className="mt-4 flex shrink-0 justify-end text-xs tabular-nums tracking-widest text-slate-400">
        <span>{String(numero).padStart(2, "0")} / 04</span>
      </footer>
    </div>
  );
}
