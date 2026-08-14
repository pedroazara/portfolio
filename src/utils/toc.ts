/**
 * Extração de sumário a partir do Markdown.
 *
 * Os identificadores gerados aqui precisam bater exatamente com os que o
 * MarkdownRenderer põe nos títulos — é o que faz o link do sumário rolar até a
 * seção certa. Por isso `headingId` é a única fonte da regra, usada dos dois
 * lados.
 */

export interface TocEntry {
  id: string;
  text: string;
  /** 2 para `##`, 3 para `###`. Define o recuo no sumário. */
  level: number;
  /**
   * Linha do título no Markdown de origem, começando em 1.
   *
   * É a chave que liga esta entrada ao título correspondente no HTML: o
   * renderizador recebe a mesma linha do `remark` e busca o id por ela. Assim
   * os dois lados derivam o id da mesma função, sem contador mutável durante o
   * render (que o StrictMode duplicaria).
   */
  line: number;
}

/** Identificador de âncora a partir do texto de um título. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Lista os títulos de nível 2 e 3 de um texto Markdown, na ordem em que
 * aparecem. Trechos dentro de blocos de código são ignorados: um `# comentário`
 * em Python não é um título do artigo.
 */
export function extractToc(markdown: string): TocEntry[] {
  if (!markdown) return [];

  const entries: TocEntry[] = [];
  const usedIds = new Map<string, number>();
  let insideFence = false;

  const sourceLines = markdown.split("\n");
  for (let index = 0; index < sourceLines.length; index++) {
    const line = sourceLines[index].trimEnd();

    if (/^\s*(```|~~~)/.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
    if (!match) continue;

    // Remove marcação inline do texto exibido no sumário: **negrito**,
    // `código`, [links](url) e ênfase viram texto puro.
    const text = match[2]
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_~`]/g, "")
      .trim();

    if (!text) continue;

    const base = headingId(text);
    // Dois títulos iguais geram o mesmo identificador; numeramos a repetição
    // para que cada link do sumário aponte para um lugar diferente.
    const seen = usedIds.get(base) ?? 0;
    usedIds.set(base, seen + 1);

    entries.push({
      id: seen === 0 ? base : `${base}-${seen}`,
      text,
      level: match[1].length,
      line: index + 1, // `remark` numera as linhas a partir de 1
    });
  }

  return entries;
}

/**
 * Mapa linha-de-origem → id, para o renderizador atribuir a cada título o
 * mesmo id que o sumário usa nos links.
 */
export function headingIdsByLine(markdown: string): Map<number, string> {
  return new Map(extractToc(markdown).map((entry) => [entry.line, entry.id]));
}
