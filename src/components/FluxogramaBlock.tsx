import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Fluxograma, PassoFluxo } from "../utils/fluxograma";

/**
 * Fluxograma desenhado a partir do texto do post (ver `utils/fluxograma`).
 *
 * Antes ele saía como bloco de código: fonte mono, cada linha com fundo
 * próprio e as setas alinhadas a espaço, que desalinhavam em qualquer tela
 * mais estreita. Aqui ele vira um diagrama sobre uma "prancheta" pontilhada:
 * cada passo é um cartão do tamanho do próprio texto, numerado em mono, e a
 * nota (`|` no texto) fica colada ao passo.
 *
 * Os cartões não esticam até a largura da coluna: com títulos de três ou
 * quatro palavras, um cartão de 700px era quase todo vazio.
 *
 * É uma lista ordenada de verdade, então o leitor de tela anuncia "lista,
 * 6 itens" e lê na ordem, com a nota junto do passo a que pertence.
 */
export default function FluxogramaBlock({ fluxo, mdLine }: { fluxo: Fluxograma; mdLine?: number }) {
  return (
    <figure
      data-md-line={mdLine}
      className="my-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 bg-[radial-gradient(circle,rgb(148_163_184/0.28)_1px,transparent_1px)] bg-size-[16px_16px] p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/40 dark:bg-[radial-gradient(circle,rgb(100_116_139/0.22)_1px,transparent_1px)]"
    >
      {fluxo.direcao === "horizontal" ? (
        <>
          {/* Lado a lado só a partir do `sm`: no celular, cinco cartões em fila
              viram colunas de uma palavra cada. `hidden` também tira a versão
              escondida da árvore de acessibilidade, então nada é lido duas vezes. */}
          <div className="sm:hidden">
            <Vertical fluxo={fluxo} />
          </div>
          <div className="hidden sm:block">
            <Horizontal fluxo={fluxo} />
          </div>
        </>
      ) : (
        <Vertical fluxo={fluxo} />
      )}
    </figure>
  );
}

const dois = (n: number) => String(n).padStart(2, "0");

const CARTAO =
  "rounded-lg border bg-white/95 px-3 py-2 shadow-xs backdrop-blur-sm dark:bg-slate-900/90";
const CARTAO_BORDA = "border-slate-200 dark:border-slate-700/80";
const CARTAO_FIM = "border-indigo-300 ring-1 ring-indigo-500/15 dark:border-indigo-500/50 dark:ring-indigo-400/20";

const NOTA =
  "rounded-md border border-dashed border-amber-400/70 bg-amber-50/90 px-2.5 py-1.5 text-xs leading-snug text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200";

function Texto({ passo }: { passo: PassoFluxo }) {
  return (
    <div className="min-w-0 hyphens-auto break-words">
      <p className="m-0 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">{passo.titulo}</p>
      {passo.detalhe && (
        <p className="m-0 mt-0.5 font-mono text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          {passo.detalhe}
        </p>
      )}
    </div>
  );
}

/** Rótulo da seta, em mono, no estilo de comentário de código. */
function Rotulo({ texto, className = "" }: { texto?: string; className?: string }) {
  if (!texto) return null;
  return (
    <span className={`font-mono text-[10px] leading-tight text-slate-500 dark:text-slate-400 ${className}`}>
      {texto}
    </span>
  );
}

/**
 * Passos em coluna, presos a um trilho à esquerda.
 *
 * O número fica num nó sobre o trilho, e o cartão encolhe até o texto. A nota
 * vai ao lado do cartão quando cabe e desce para baixo dele quando não.
 */
function Vertical({ fluxo }: { fluxo: Fluxograma }) {
  const { passos, rotulos } = fluxo;

  return (
    <ol aria-label="Fluxograma" className="m-0 list-none p-0">
      {passos.map((passo, i) => {
        const ultimo = i === passos.length - 1;
        return (
          <li key={i} className={`relative pl-11 ${ultimo ? "" : "pb-5"}`}>
            {/* Trilho até o próximo nó, com a ponta da seta embaixo. */}
            {!ultimo && (
              <span aria-hidden="true" className="absolute top-8 bottom-1 left-[13px] flex w-px flex-col items-center">
                <span className="w-px flex-1 bg-linear-to-b from-indigo-400/70 to-slate-300 dark:from-indigo-400/60 dark:to-slate-700" />
                <ChevronDown className="-mt-2 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              </span>
            )}
            <span
              aria-hidden="true"
              className={`absolute top-1 left-0 flex h-7 w-7 items-center justify-center rounded-md border font-mono text-[11px] font-bold ${
                ultimo
                  ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500"
                  : "border-indigo-300 bg-white text-indigo-600 dark:border-indigo-500/50 dark:bg-slate-900 dark:text-indigo-300"
              }`}
            >
              {dois(i + 1)}
            </span>

            <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-0">
              <div className={`${CARTAO} ${ultimo ? CARTAO_FIM : CARTAO_BORDA} w-fit max-w-full sm:max-w-[60%] sm:shrink-0`}>
                <Texto passo={passo} />
              </div>
              {passo.nota && (
                <>
                  <span aria-hidden="true" className="hidden w-5 shrink-0 border-t border-dashed border-amber-400/70 sm:block dark:border-amber-500/40" />
                  <aside className={`${NOTA} max-w-full sm:max-w-xs`}>{passo.nota}</aside>
                </>
              )}
            </div>

            {!ultimo && rotulos[i] && <Rotulo texto={`// ${rotulos[i]}`} className="mt-2 block" />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Passos lado a lado, com a nota embaixo de cada um.
 *
 * A grade tem duas faixas — cartões em cima, notas embaixo — e cada `<li>`
 * herda essas faixas por `subgrid`. Assim os cartões da linha têm todos a
 * altura do mais alto, e a nota de um passo não empurra o cartão do vizinho.
 * As colunas têm teto de largura: com poucos passos, a linha fica do tamanho
 * do conteúdo em vez de esticar até a borda. Com muitos, rola de lado.
 */
function Horizontal({ fluxo }: { fluxo: Fluxograma }) {
  const { passos, rotulos } = fluxo;
  // Uma coluna por passo e outra, estreita, para a seta que vem depois dele.
  const colunas = `repeat(${passos.length}, minmax(7rem, 13rem) auto)`;

  return (
    <ol
      aria-label="Fluxograma"
      style={{ "--colunas": colunas } as React.CSSProperties}
      className="m-0 grid max-w-full list-none grid-cols-(--colunas) overflow-x-auto p-0 pb-1"
    >
      {passos.map((passo, i) => {
        const ultimo = i === passos.length - 1;
        return (
          <li key={i} className="col-span-2 row-span-2 grid grid-cols-subgrid grid-rows-subgrid">
            <div className={`${CARTAO} ${ultimo ? CARTAO_FIM : CARTAO_BORDA} col-start-1 row-start-1`}>
              <span
                aria-hidden="true"
                className={`mb-1 block font-mono text-[10px] font-bold tracking-wider ${
                  ultimo ? "text-indigo-600 dark:text-indigo-300" : "text-indigo-500/80 dark:text-indigo-400/80"
                }`}
              >
                {dois(i + 1)}
              </span>
              <Texto passo={passo} />
            </div>

            {passo.nota && (
              <div className="col-start-1 row-start-2 flex flex-col items-center">
                <span aria-hidden="true" className="h-2.5 border-l border-dashed border-amber-400/70 dark:border-amber-500/40" />
                <aside className={`${NOTA} w-full`}>{passo.nota}</aside>
              </div>
            )}

            {!ultimo && (
              <div
                aria-hidden="true"
                className="col-start-2 row-start-1 flex max-w-[5rem] flex-col items-center justify-center px-1.5 text-center"
              >
                <Rotulo texto={rotulos[i]} className="mb-0.5" />
                <span className="flex items-center text-slate-400 dark:text-slate-500">
                  <span className="h-px w-3 bg-linear-to-r from-indigo-400/70 to-slate-300 dark:to-slate-600" />
                  <ChevronRight className="-ml-1.5 h-3.5 w-3.5" />
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
