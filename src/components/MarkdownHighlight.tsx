import React from "react";

/**
 * Camada de destaque desenhada atrás do textarea.
 *
 * O textarea fica com o texto transparente e só o cursor visível; o que se lê é
 * esta camada, alinhada caractere a caractere com ele. Por isso nada aqui pode
 * ocultar, encurtar ou reordenar caracteres — apenas colorir. Qualquer mudança
 * no tamanho do texto desalinharia o cursor.
 *
 * Compartilhe `EDITOR_TEXT_CLASS` entre as duas camadas: fonte, tamanho,
 * entrelinha e quebra de linha precisam ser idênticos.
 */

/** Tipografia e quebra de linha usadas pelas duas camadas. */
export const EDITOR_TEXT_CLASS =
  "px-4 py-3 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words";

interface Token {
  text: string;
  kind: "image" | "heading" | "code" | "bold" | "plain";
  /** Partes da referência de imagem: `![`, legenda, `](`, caminho, `)`. */
  imageParts?: { alt: string; path: string };
}

/** Quebra o Markdown em trechos coloríveis, preservando todo o texto. */
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];

  // A ordem importa: imagem antes de link, para `![x](y)` não virar `[x](y)`.
  const pattern = /(!\[([^\]]*)\]\(([^)]*)\))|(^#{1,6} [^\n]*)|(`[^`\n]+`)|(\*\*[^*\n]+\*\*)/gm;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: source.slice(lastIndex, match.index), kind: "plain" });
    }

    const [full, image, alt, path, heading, code, bold] = match;

    if (image) {
      tokens.push({ text: full, kind: "image", imageParts: { alt: alt ?? "", path: path ?? "" } });
    } else {
      tokens.push({
        text: full,
        kind: heading ? "heading" : code ? "code" : bold ? "bold" : "plain",
      });
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < source.length) {
    tokens.push({ text: source.slice(lastIndex), kind: "plain" });
  }

  return tokens;
}

const KIND_CLASS: Record<Exclude<Token["kind"], "image">, string> = {
  heading: "font-bold text-slate-900 dark:text-white",
  code: "rounded bg-slate-200/70 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400",
  bold: "font-bold text-slate-900 dark:text-slate-100",
  plain: "",
};

/**
 * Referência de imagem com a legenda em destaque.
 *
 * A legenda é o único trecho que se escreve à mão — e é ela que vira a
 * `figcaption` no artigo publicado. O caminho do arquivo é gerado e nunca
 * editado, então recebe um tom apagado: some do caminho da leitura sem sair da
 * linha, o que é obrigatório para o cursor continuar alinhado.
 */
function ImageToken({ alt, path }: { alt: string; path: string }) {
  return (
    <span className="rounded-md bg-indigo-100/80 py-0.5 [box-decoration-break:clone] dark:bg-indigo-950/60">
      <span className="text-indigo-400/70 dark:text-indigo-500/60">![</span>
      <span className="font-semibold text-indigo-800 dark:text-indigo-200">
        {alt || " "}
      </span>
      <span className="text-indigo-400/70 dark:text-indigo-500/60">](</span>
      <span className="text-indigo-400/60 dark:text-indigo-500/50">{path}</span>
      <span className="text-indigo-400/70 dark:text-indigo-500/60">)</span>
    </span>
  );
}

interface MarkdownHighlightProps {
  value: string;
  className?: string;
}

const MarkdownHighlight = React.forwardRef<HTMLPreElement, MarkdownHighlightProps>(
  function MarkdownHighlight({ value, className = "" }, ref) {
    // A última linha em branco some sem um caractere que a sustente; sem isto,
    // a camada encolhe antes do textarea ao apertar Enter no fim do texto.
    const tokens = tokenize(value.endsWith("\n") ? `${value} ` : value);

    return (
      <pre
        ref={ref}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden text-slate-600 dark:text-slate-300 ${EDITOR_TEXT_CLASS} ${className}`}
      >
        {tokens.map((token, idx) =>
          token.kind === "image" && token.imageParts ? (
            <ImageToken key={idx} alt={token.imageParts.alt} path={token.imageParts.path} />
          ) : (
            <span key={idx} className={KIND_CLASS[token.kind as Exclude<Token["kind"], "image">]}>
              {token.text}
            </span>
          )
        )}
      </pre>
    );
  }
);

export default MarkdownHighlight;
