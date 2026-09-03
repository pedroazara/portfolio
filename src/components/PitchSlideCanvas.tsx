import React from "react";

export type PitchAccent = "azul" | "verde" | "dourado" | "cnpem";

/**
 * Uma cor por slide: os três primeiros na paleta verde-amarelo-azul da
 * bandeira, dando ritmo à sequência; o último fecha com o espectro colorido
 * do logo do CNPEM, para quem a apresentação é feita.
 */
const GRADIENTES: Record<PitchAccent, string> = {
  azul: "bg-gradient-to-br from-blue-800 via-blue-700 to-emerald-700",
  verde: "bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700",
  dourado: "bg-gradient-to-br from-amber-500 via-yellow-500 to-green-600",
  cnpem: "bg-[linear-gradient(135deg,#f97316,#eab308,#22c55e,#14b8a6,#2563eb,#7c3aed)]",
};

export const ACCENT_SOLIDO: Record<PitchAccent, string> = {
  azul: "bg-blue-600",
  verde: "bg-emerald-600",
  dourado: "bg-amber-500",
  cnpem: "bg-teal-500",
};

interface PitchSlideCanvasProps {
  title: string;
  children: React.ReactNode;
  accent: PitchAccent;
  /** Posição do slide (1-based) — vira a marca d'água numérica do canto. */
  numero: number;
  /** Conteúdo que preenche o cartão inteiro (grade de projetos) em vez de
   *  rolar como texto solto dentro dele. */
  fill?: boolean;
}

/**
 * Moldura visual de um slide do elevator pitch: fundo em gradiente (uma cor
 * por slide), número do slide como marca d'água, título grande em branco, e
 * o conteúdo dentro de um cartão claro flutuando por cima.
 *
 * Sempre com essa aparência, direto, independente do tema claro/escuro do
 * site — é uma tela que se projeta numa entrevista, não uma leitura do
 * portfólio.
 */
export default function PitchSlideCanvas({ title, children, accent, numero, fill = false }: PitchSlideCanvasProps) {
  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-3xl bg-[length:200%_200%] px-6 py-7 sm:px-12 sm:py-10 ${GRADIENTES[accent]} animate-gradient-flow`}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-black/10 blur-3xl" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-10 select-none font-display text-[11rem] font-black leading-none text-white/10 sm:text-[14rem]"
      >
        {String(numero).padStart(2, "0")}
      </span>

      {title && (
        <h2 className="relative shrink-0 font-display text-3xl font-black leading-tight text-white drop-shadow-sm sm:text-5xl">
          {title}
        </h2>
      )}

      <div className={`relative min-h-0 flex-1 ${title ? "mt-6" : ""} ${fill ? "overflow-hidden" : "overflow-y-auto"}`}>
        {children}
      </div>
    </div>
  );
}
