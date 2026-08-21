/**
 * O ponto do texto em que a leitura parou, levado até o editor.
 *
 * Quem escreve costuma descobrir o que quer mudar lendo a página publicada, no
 * meio do artigo. Antes, "Editar" abria o editor no topo e sobrava a busca
 * manual pelo parágrafo — pior quanto mais longo o texto. Agora a leitura mede
 * onde o olho está e o editor abre já naquela linha.
 *
 * A ponte entre as duas telas é o `state` da navegação: nada disso pertence à
 * URL, que é pública e compartilhável, e um alvo perdido (recarregar a página
 * do editor, por exemplo) só faz voltar ao comportamento antigo.
 */

export interface EditTarget {
  /** Campo do formulário que originou o texto: `content`, `detailedDescription`… */
  field: string;
  /** Linha do Markdown de origem, contada a partir de 1. */
  line: number;
}

/** Chave do alvo dentro do `state` da navegação. */
export interface EditTargetState {
  editTarget?: EditTarget | null;
}

/**
 * Altura, a partir do topo da janela, tratada como "o que estou lendo agora".
 *
 * Fica abaixo do cabeçalho fixo: o bloco logo acima dessa linha imaginária é o
 * último que o leitor terminou de ler.
 */
const ANCHOR_Y = 180;

/** Distância do topo em que o editor coloca a linha alvo. */
const EDITOR_TOP_MARGIN = 160;

/**
 * O bloco que está sendo lido, em coordenadas do texto-fonte.
 *
 * Percorre os blocos na ordem do documento e fica com o último que começa
 * acima da âncora. Se nenhum começa (página no topo), devolve o primeiro.
 */
export function editTargetFromViewport(): EditTarget | null {
  if (typeof document === "undefined") return null;

  let first: EditTarget | null = null;
  let lastAbove: EditTarget | null = null;

  document.querySelectorAll<HTMLElement>("[data-md-field]").forEach((container) => {
    const field = container.dataset.mdField;
    if (!field) return;

    container.querySelectorAll<HTMLElement>("[data-md-line]").forEach((block) => {
      const line = Number(block.dataset.mdLine);
      if (!Number.isFinite(line) || line < 1) return;

      // Blocos aninhados (um item dentro da lista) repetem a região; o mais
      // interno vem depois na ordem do documento e refina o alvo.
      const alvo = { field, line };
      if (!first) first = alvo;
      if (block.getBoundingClientRect().top <= ANCHOR_Y) lastAbove = alvo;
    });
  });

  return lastAbove || first;
}

/** Índice, no texto, do primeiro caractere da linha pedida. */
export function offsetOfLine(text: string, line: number): number {
  if (line <= 1) return 0;

  let offset = 0;
  for (let atual = 1; atual < line; atual++) {
    const quebra = text.indexOf("\n", offset);
    if (quebra === -1) return text.length;
    offset = quebra + 1;
  }
  return offset;
}

/**
 * Posição na tela de um caractere dentro de uma camada de texto.
 *
 * Serve para a camada de destaque do editor, que espelha o textarea caractere
 * a caractere: um `Range` sobre ela diz onde a linha caiu depois das quebras
 * automáticas, o que uma conta com altura de linha não conseguiria.
 */
function rectAtOffset(layer: HTMLElement, offset: number): DOMRect | null {
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let node = walker.nextNode();

  while (node) {
    const length = node.nodeValue?.length ?? 0;
    if (seen + length >= offset) {
      const start = Math.min(Math.max(offset - seen, 0), Math.max(length - 1, 0));
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, Math.min(start + 1, length));
      const rect = range.getBoundingClientRect();
      if (rect.height > 0) return rect;
    }
    seen += length;
    node = walker.nextNode();
  }

  return null;
}

/**
 * Leva o campo à linha pedida: cursor no início dela e rolagem até vê-la.
 *
 * `layer` é opcional — sem ela, sobra estimar a altura pela proporção de
 * linhas, que erra quando o texto tem linhas muito longas mas ainda deixa o
 * leitor perto do trecho certo.
 */
export function scrollTextareaToLine(
  textarea: HTMLTextAreaElement,
  line: number,
  layer?: HTMLElement | null
) {
  const text = textarea.value;
  const offset = offsetOfLine(text, line);

  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(offset, offset);

  const rect = layer ? rectAtOffset(layer, offset) : null;
  const caixa = textarea.getBoundingClientRect();

  const topo = rect
    ? rect.top
    : caixa.top + (offset / Math.max(text.length, 1)) * caixa.height;

  window.scrollTo({
    top: Math.max(window.scrollY + topo - EDITOR_TOP_MARGIN, 0),
    behavior: "smooth",
  });
}
