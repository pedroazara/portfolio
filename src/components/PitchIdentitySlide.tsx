import React from "react";
import LocalImage from "./LocalImage";

interface PitchIdentitySlideProps {
  nome: string;
  avatarUrl?: string;
  /** Linhas curtas de apoio (cargo/curso, localização) — viram selos abaixo do nome. */
  linhas: string[];
}

/**
 * Slide de abertura do elevator pitch: retrato, não texto.
 *
 * Um "quem sou eu" não precisa de frase nenhuma além do próprio nome — a
 * pessoa já está falando. A foto grande e os selos curtos abaixo servem de
 * apoio visual, não de roteiro.
 */
export default function PitchIdentitySlide({ nome, avatarUrl, linhas }: PitchIdentitySlideProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-2 text-center">
      <div className="h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-white/40 bg-white/10 shadow-2xl sm:h-44 sm:w-44">
        {avatarUrl ? (
          <LocalImage src={avatarUrl} alt={nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-4xl font-black text-white/70 sm:text-6xl">
            {nome.charAt(0)}
          </div>
        )}
      </div>

      <h3 className="font-display text-3xl font-black leading-tight text-white drop-shadow-sm sm:text-5xl">
        {nome}
      </h3>

      {linhas.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {linhas.map((linha, i) => (
            <span
              key={i}
              className="rounded-full bg-white/95 px-5 py-2 text-sm font-bold text-slate-800 shadow-lg sm:text-base dark:bg-slate-900/95 dark:text-slate-100"
            >
              {linha}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
