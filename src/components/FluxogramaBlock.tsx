import React from "react";
import { ChevronDown } from "lucide-react";
import type { Fluxograma } from "../utils/fluxograma";

/**
 * Fluxograma desenhado a partir do texto do post (ver `utils/fluxograma`).
 *
 * Antes ele saía como bloco de código: fonte mono, cada linha com fundo
 * próprio e as setas alinhadas a espaço, que desalinhavam em qualquer tela
 * mais estreita. Aqui cada passo é um cartão numerado, a seta é desenhada e
 * a nota (`|` no texto) fica ao lado do passo — embaixo dele no celular.
 *
 * É uma lista ordenada de verdade, então o leitor de tela anuncia "lista,
 * 6 itens" e lê na ordem, com a nota junto do passo a que pertence.
 */
export default function FluxogramaBlock({ fluxo, mdLine }: { fluxo: Fluxograma; mdLine?: number }) {
  const { passos, rotulos } = fluxo;
  const temNota = passos.some((p) => p.nota);
  // Com notas, a coluna dos passos fica à esquerda e as notas ao lado; sem
  // elas, a coluna única é centrada para não sobrar um vazio à direita.
  const coluna = temNota ? "sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] sm:gap-x-6" : "mx-auto max-w-md";

  return (
    <figure data-md-line={mdLine} className="my-6">
      <ol aria-label="Fluxograma" className="list-none p-0 m-0">
        {passos.map((passo, i) => {
          const ultimo = i === passos.length - 1;
          return (
            <li key={i} className={coluna}>
              <div
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 shadow-xs sm:col-start-1 sm:row-start-1 ${
                  ultimo
                    ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-950/40"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white dark:bg-indigo-500"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="m-0 font-semibold leading-snug text-slate-900 dark:text-slate-100 text-sm sm:text-[15px]">
                    {passo.titulo}
                  </p>
                  {passo.detalhe && (
                    <p className="m-0 mt-0.5 text-xs sm:text-[13px] leading-snug text-slate-500 dark:text-slate-400">
                      {passo.detalhe}
                    </p>
                  )}
                </div>
              </div>

              {/* Na ordem do DOM a nota vem logo depois do passo: assim fica
                  embaixo dele no celular e é lida junto pelo leitor de tela. No
                  desktop a grade a leva para a coluna da direita. */}
              {passo.nota && (
                <aside className="relative ml-9 mt-2 rounded-lg border border-dashed border-amber-400/70 bg-amber-50/70 px-3 py-2 text-xs sm:text-[13px] leading-snug text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-200 sm:col-start-2 sm:row-start-1 sm:ml-0 sm:mt-0 sm:self-start">
                  {/* Ligação tracejada até o cartão, só quando estão lado a lado. */}
                  <span
                    aria-hidden="true"
                    className="absolute top-5 -left-6 hidden w-6 border-t border-dashed border-amber-400/70 dark:border-amber-500/40 sm:block"
                  />
                  {passo.nota}
                </aside>
              )}

              {!ultimo && (
                <div
                  aria-hidden="true"
                  className="flex flex-col items-center py-1 text-slate-400 dark:text-slate-500 sm:col-start-1 sm:row-start-2"
                >
                  <span className="h-3 w-px bg-current" />
                  {rotulos[i] && (
                    <span className="my-0.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] italic leading-none text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      {rotulos[i]}
                    </span>
                  )}
                  <ChevronDown className="-mt-1 h-4 w-4" />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
