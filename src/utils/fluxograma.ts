/**
 * Fluxograma escrito em texto puro, do jeito que já se escreve nos posts:
 *
 *     Tema aleatório
 *         ↓
 *     Pesquisa livre (tempo limitado)   |   O sistema monta a rubrica
 *         ↓ quando o tempo acaba
 *     Relatório com feedback
 *
 * - uma linha só com seta (`↓`, `->`, `→`, `=>`, `v`) liga dois passos; o que
 *   vier depois da seta é o rótulo da ligação;
 * - `|` separa o passo de uma nota ao lado; uma linha que começa com `|`
 *   continua a nota do passo anterior;
 * - um único parêntese no fim do passo vira o detalhe, em letra menor;
 * - linhas seguidas sem seta entre elas são o mesmo passo (as de baixo viram
 *   detalhe).
 *
 * Sem nenhuma seta (só num bloco ```fluxo explícito), cada linha é um passo.
 *
 * Na horizontal: ```fluxo horizontal no cabeçalho do bloco, ou a corrente
 * numa linha só — `Coleta → Modelo → Resultado` (também com `->` e `=>`).
 */

export interface PassoFluxo {
  titulo: string;
  detalhe?: string;
  nota?: string;
}

export interface Fluxograma {
  passos: PassoFluxo[];
  /** `rotulos[i]` é o texto da seta entre `passos[i]` e `passos[i + 1]`. */
  rotulos: (string | undefined)[];
  direcao: "vertical" | "horizontal";
}

/** Seta sozinha na linha, com rótulo opcional depois dela. */
const SETA = /^\s*(?:↓|⬇|⇓|→|->|-->|=>|[vV](?=\s*$))\s*(.*?)\s*$/;

/** Divisória da nota: `|` ou `│` cercado de espaço, ou no começo da linha. */
const NOTA = /(?:^|\s)[|│](?:\s|$)/;

/** Seta no meio da linha, separando os passos de uma corrente. */
const CORRENTE = /\s+(?:→|->|=>)\s+/;

/** O que, no cabeçalho do bloco (```fluxo <meta>), pede a horizontal. */
const META_HORIZONTAL = /\b(?:horizontal|h)\b|→|->/i;

function ehSeta(linha: string): boolean {
  return SETA.test(linha);
}

function rotuloDa(linha: string): string | undefined {
  const resto = SETA.exec(linha)?.[1] ?? "";
  // Aceita `↓ se aprovado`, `↓ (se aprovado)` e `↓: se aprovado`.
  const limpo = resto.replace(/^[:\-–—]\s*/, "").replace(/^\((.*)\)$/, "$1").trim();
  return limpo || undefined;
}

/** Separa `Título (detalhe)` quando há um parêntese só, e ele fecha a linha. */
function separaDetalhe(texto: string): { titulo: string; detalhe?: string } {
  const m = /^([^()]+?)\s*\(([^()]+)\)$/.exec(texto);
  if (!m) return { titulo: texto };
  return { titulo: m[1].trim(), detalhe: m[2].trim() };
}

function junta(a: string | undefined, b: string): string {
  return a ? `${a} ${b}` : b;
}

export function parseFluxograma(codigo: string, meta = ""): Fluxograma {
  let linhas = codigo.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());
  let temSeta = linhas.some(ehSeta);
  let direcao: Fluxograma["direcao"] = META_HORIZONTAL.test(meta) ? "horizontal" : "vertical";

  // Corrente numa linha: vira o mesmo texto com uma seta por linha.
  if (!temSeta && linhas.some((l) => CORRENTE.test(l))) {
    linhas = linhas.flatMap((l, i) => [...(i ? ["↓"] : []), ...l.split(CORRENTE).flatMap((p, j) => (j ? ["↓", p] : [p]))]);
    temSeta = true;
    direcao = "horizontal";
  }

  const passos: PassoFluxo[] = [];
  const rotulos: (string | undefined)[] = [];
  // Próxima linha de texto abre um passo novo (depois de seta, ou no início).
  let abrePasso = true;

  for (const linha of linhas) {
    if (ehSeta(linha)) {
      if (passos.length) rotulos[passos.length - 1] = rotuloDa(linha);
      abrePasso = true;
      continue;
    }

    const corte = NOTA.exec(linha);
    const esquerda = (corte ? linha.slice(0, corte.index) : linha).trim();
    const nota = corte ? linha.slice(corte.index + corte[0].length).trim() : "";
    const atual = passos[passos.length - 1];

    if (!esquerda) {
      // Só nota: continuação da nota do passo de cima.
      if (atual && nota) atual.nota = junta(atual.nota, nota);
      continue;
    }

    if (abrePasso || !temSeta || !atual) {
      passos.push({ ...separaDetalhe(esquerda), ...(nota ? { nota } : {}) });
      abrePasso = false;
      continue;
    }

    atual.detalhe = junta(atual.detalhe, esquerda);
    if (nota) atual.nota = junta(atual.nota, nota);
  }

  rotulos.length = Math.max(0, passos.length - 1);
  return { passos, rotulos, direcao };
}

/**
 * Diz se um bloco de código sem linguagem é, na verdade, um fluxograma em
 * texto: ao menos duas setas sozinhas na linha, nenhuma nas pontas e nunca
 * duas seguidas. É o formato que os posts já usam, então eles passam a sair
 * desenhados sem precisar mudar o texto.
 */
export function pareceFluxograma(codigo: string): boolean {
  const linhas = codigo.split("\n").filter((l) => l.trim());
  const setas = linhas.map(ehSeta);
  if (setas.filter(Boolean).length < 2) return false;
  if (setas[0] || setas[setas.length - 1]) return false;
  return setas.every((s, i) => !(s && setas[i - 1]));
}
