import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Fluxograma, PassoFluxo } from "../utils/fluxograma";

/**
 * Fluxograma desenhado a partir do texto do post (ver `utils/fluxograma`).
 *
 * Antes ele saía como bloco de código: fonte mono, cada linha com fundo
 * próprio e as setas alinhadas a espaço, que desalinhavam em qualquer tela
 * mais estreita. Aqui cada passo é um cartão numerado, a seta é desenhada e
 * a nota (`|` no texto) fica junto do passo.
 *
 * É uma lista ordenada de verdade, então o leitor de tela anuncia "lista,
 * 6 itens" e lê na ordem, com a nota junto do passo a que pertence.
 */
export default function FluxogramaBlock({ fluxo, mdLine }: { fluxo: Fluxograma; mdLine?: number }) {
  return (
    <figure data-md-line={mdLine} className="my-6">
      {fluxo.direcao === "horizontal" ? <Horizontal fluxo={fluxo} /> : <Vertical fluxo={fluxo} />}
    </figure>
  );
}

/** Nota ao lado (vertical) ou embaixo (horizontal) do passo. */
const NOTA_CLASSE =
  "relative rounded-lg border border-dashed border-amber-400/70 bg-amber-50/70 px-3 py-2 text-xs sm:text-[13px] leading-snug text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-200";
const LIGACAO_NOTA = "absolute hidden border-dashed border-amber-400/70 dark:border-amber-500/40 sm:block";

/**
 * Um passo. `empilhado` põe o número em cima do título a partir do `sm` —
 * na fila horizontal cada cartão tem pouca largura, e o número ao lado
 * roubava uma coluna inteira do texto.
 */
function Cartao({
  passo,
  numero,
  ultimo,
  empilhado = false,
  className = "",
}: {
  passo: PassoFluxo;
  numero: number;
  ultimo: boolean;
  empilhado?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 shadow-xs ${
        empilhado ? "sm:flex-col sm:gap-2 sm:px-3" : ""
      } ${
        ultimo
          ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-950/40"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white dark:bg-indigo-500"
      >
        {numero}
      </span>
      <div className="min-w-0 hyphens-auto break-words">
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
  );
}

function Rotulo({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <span className="my-0.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-center text-[11px] italic leading-tight text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {texto}
    </span>
  );
}

/** Seta para baixo, com o rótulo no meio. */
function SetaBaixo({ rotulo, className = "" }: { rotulo?: string; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex flex-col items-center py-1 text-slate-400 dark:text-slate-500 ${className}`}>
      <span className="h-3 w-px bg-current" />
      <Rotulo texto={rotulo} />
      <ChevronDown className="-mt-1 h-4 w-4" />
    </div>
  );
}

/**
 * Coluna de passos. Com notas, elas ficam numa segunda coluna ao lado; sem
 * elas, a coluna única é centrada para não sobrar um vazio à direita. No
 * celular a nota desce para baixo do passo.
 */
function Vertical({ fluxo }: { fluxo: Fluxograma }) {
  const { passos, rotulos } = fluxo;
  const temNota = passos.some((p) => p.nota);
  const coluna = temNota ? "sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] sm:gap-x-6" : "mx-auto max-w-md";

  return (
    <ol aria-label="Fluxograma" className="list-none p-0 m-0">
      {passos.map((passo, i) => {
        const ultimo = i === passos.length - 1;
        return (
          <li key={i} className={coluna}>
            <Cartao passo={passo} numero={i + 1} ultimo={ultimo} className="sm:col-start-1 sm:row-start-1" />

            {/* Na ordem do DOM a nota vem logo depois do passo: assim fica
                embaixo dele no celular e é lida junto pelo leitor de tela. No
                desktop a grade a leva para a coluna da direita. */}
            {passo.nota && (
              <aside className={`${NOTA_CLASSE} ml-9 mt-2 sm:col-start-2 sm:row-start-1 sm:ml-0 sm:mt-0 sm:self-start`}>
                <span aria-hidden="true" className={`${LIGACAO_NOTA} top-5 -left-6 w-6 border-t`} />
                {passo.nota}
              </aside>
            )}

            {!ultimo && <SetaBaixo rotulo={rotulos[i]} className="sm:col-start-1 sm:row-start-2" />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Linha de passos lado a lado, com a nota embaixo de cada um.
 *
 * Só a partir do `sm`: numa tela de celular, cinco cartões em fila viram
 * colunas de uma palavra cada. Lá o mesmo DOM empilha como na vertical. Com
 * muitos passos, a linha rola de lado em vez de espremer os cartões.
 *
 * A grade tem duas faixas — cartões em cima, notas embaixo — e cada `<li>`
 * herda essas faixas por `subgrid`. Assim os cartões da linha têm todos a
 * altura do mais alto, e a nota de um passo não empurra o cartão do vizinho.
 */
function Horizontal({ fluxo }: { fluxo: Fluxograma }) {
  const { passos, rotulos } = fluxo;
  // Uma coluna por passo e outra, estreita, para a seta que vem depois dele.
  const colunas = `repeat(${passos.length}, minmax(7rem, 1fr) auto)`;

  return (
    <ol
      aria-label="Fluxograma"
      style={{ "--colunas": colunas } as React.CSSProperties}
      className="list-none p-0 m-0 sm:grid sm:grid-cols-(--colunas) sm:overflow-x-auto sm:pb-2"
    >
      {passos.map((passo, i) => {
        const ultimo = i === passos.length - 1;
        return (
          <li key={i} className="sm:col-span-2 sm:row-span-2 sm:grid sm:grid-cols-subgrid sm:grid-rows-subgrid">
            <Cartao passo={passo} numero={i + 1} ultimo={ultimo} empilhado className="sm:col-start-1 sm:row-start-1" />

            {passo.nota && (
              <aside className={`${NOTA_CLASSE} ml-9 mt-2 sm:col-start-1 sm:row-start-2 sm:ml-0 sm:mt-3 sm:self-start`}>
                <span aria-hidden="true" className={`${LIGACAO_NOTA} -top-3 left-1/2 h-3 border-l`} />
                {passo.nota}
              </aside>
            )}

            {!ultimo && (
              <>
                <SetaBaixo rotulo={rotulos[i]} className="sm:hidden" />
                <div
                  aria-hidden="true"
                  className="hidden max-w-[4.5rem] flex-col items-center self-center px-1.5 text-slate-400 dark:text-slate-500 sm:col-start-2 sm:row-start-1 sm:flex"
                >
                  <Rotulo texto={rotulos[i]} />
                  <span className="flex items-center">
                    <span className="h-px w-3 bg-current" />
                    <ChevronRight className="-ml-1.5 h-4 w-4" />
                  </span>
                </div>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
