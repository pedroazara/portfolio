import React from "react";
import LocalImage from "./LocalImage";

interface PitchIdentitySlideProps {
  nome: string;
  avatarUrl?: string;
  /** Tópicos do "sobre mim", em ordem — cada um vira uma linha numerada. */
  linhas: string[];
}

/** Nome, retrato e tópicos breves para apoiar a apresentação oral. */
export default function PitchIdentitySlide({ nome, avatarUrl, linhas }: PitchIdentitySlideProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-2 sm:flex-row sm:items-center sm:justify-center sm:gap-8 lg:gap-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center sm:items-start sm:text-left lg:max-w-lg lg:gap-8">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-white/70 lg:text-sm lg:tracking-[0.35em]">
            Sobre mim
          </p>
          <h3 className="mt-1 font-display text-3xl font-black leading-tight text-white drop-shadow-sm sm:text-4xl lg:mt-2 lg:text-6xl">
            {nome}
          </h3>
        </div>

        {linhas.length > 0 && (
          <ol className="flex w-full flex-col gap-0">
            {linhas.map((linha, i) => (
              <li
                key={i}
                className="flex max-w-full items-center gap-4 border-b border-white/15 py-4 text-base font-medium text-white lg:text-xl"
              >
                <span className="shrink-0 font-mono text-xs font-medium text-slate-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 text-left">{linha}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="h-32 w-32 shrink-0 overflow-hidden rounded-sm border border-white/20 bg-white/10 sm:h-48 sm:w-48 lg:h-80 lg:w-80">
        {avatarUrl ? (
          <LocalImage src={avatarUrl} alt={nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-4xl font-black text-white/70 sm:text-5xl lg:text-7xl">
            {nome.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );
}
