import type { PrismTheme } from "prism-react-renderer";

/**
 * Tema de sintaxe próprio do site — índigo e slate, a mesma dupla de
 * `--acento`/`--tinta` usada no resto do layout — em vez do roxo-rosa-ciano
 * do Dracula, uma família de cor que não aparece em nenhum outro canto do
 * site. Compartilhado entre os blocos de código do editor Python
 * (`PyBlocks`) e os do Markdown dos posts (`MarkdownRendererImpl`), para que
 * toda área de código no blog leia como a mesma paleta.
 */
export const codeTheme: PrismTheme = {
  plain: {
    color: "#e2e8f0",
    backgroundColor: "#0f172a",
  },
  styles: [
    { types: ["prolog", "constant", "builtin"], style: { color: "#fcd34d" } },
    { types: ["inserted", "function"], style: { color: "#7dd3fc" } },
    { types: ["deleted"], style: { color: "#f87171" } },
    { types: ["changed"], style: { color: "#fbbf24" } },
    { types: ["punctuation", "symbol"], style: { color: "#cbd5e1" } },
    { types: ["string", "char", "tag", "selector"], style: { color: "#6ee7b7" } },
    { types: ["keyword", "variable"], style: { color: "#a5b4fc" } },
    { types: ["comment"], style: { color: "#64748b" } },
    { types: ["attr-name"], style: { color: "#c4b5fd" } },
  ],
};
