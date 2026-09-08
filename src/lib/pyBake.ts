import { runPython, resetPythonSession } from "./pyodideRuntime";

/**
 * "Assa" os blocos ```python do Markdown: executa cada um (via Pyodide) e
 * grava o resultado logo abaixo, como um segundo fence ```pyresult contendo
 * JSON. É o que `PyBlocks.tsx` lê para mostrar a saída sem precisar rodar
 * nada no navegador de quem lê.
 *
 * Os blocos rodam em sequência numa única sessão Python — como células de um
 * notebook: um `import numpy as np` ou uma variável definida no primeiro
 * bloco continua valendo nos de baixo.
 *
 * Rodar de novo sobre um conteúdo já assado substitui o `pyresult` anterior —
 * o regex casa o par inteiro quando ele já existe.
 */
const BLOCK_RE = /```(python|py)\n([\s\S]*?)\n?```(?:\n```pyresult\n[\s\S]*?\n?```)?/g;

export interface BakeOptions {
  onProgress?: (message: string) => void;
  /** Recebe uma data URL de PNG e devolve a referência a gravar no JSON (db:… ou a própria data URL). */
  uploadImage: (dataUrl: string, index: number) => Promise<string>;
}

/** Roda um bloco e monta o par de fences (código + `pyresult`) pronto para entrar no texto. */
async function renderBlock(
  lang: string,
  code: string,
  onProgress: ((msg: string) => void) | undefined,
  uploadImage: BakeOptions["uploadImage"]
): Promise<string> {
  const runResult = await runPython(code, onProgress);

  const images: string[] = [];
  for (const imageData of runResult.images) {
    images.push(await uploadImage(`data:image/png;base64,${imageData}`, images.length));
  }

  const payload = JSON.stringify({
    stdout: runResult.stdout || undefined,
    stderr: runResult.stderr || undefined,
    error: runResult.error || undefined,
    images: images.length ? images : undefined,
  });

  return "```" + lang + "\n" + code + "\n```\n```pyresult\n" + payload + "\n```";
}

/** Reinicia a sessão e executa todos os blocos do documento, em ordem. */
export async function bakePythonBlocks(content: string, opts: BakeOptions): Promise<string> {
  const matches = [...content.matchAll(BLOCK_RE)];
  if (matches.length === 0) return content;

  resetPythonSession();

  let result = "";
  let lastIndex = 0;
  let count = 0;

  for (const match of matches) {
    const [full, lang, code] = match;
    const start = match.index ?? 0;
    result += content.slice(lastIndex, start);
    lastIndex = start + full.length;

    count++;
    opts.onProgress?.(`Executando bloco ${count}/${matches.length}…`);
    result += await renderBlock(lang, code, (msg) => opts.onProgress?.(`Bloco ${count}/${matches.length}: ${msg}`), opts.uploadImage);
  }

  result += content.slice(lastIndex);
  return result;
}

/** Linha (1-based) onde está a posição `charIndex` do texto. */
function lineAt(content: string, charIndex: number): number {
  let line = 1;
  for (let i = 0; i < charIndex; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

/**
 * Executa só o bloco que começa na linha `line` — sem regravar imagem nem
 * saída dos demais. Para que ele veja o mesmo `import`/variável que veria
 * numa passada completa, os blocos anteriores são "replayados" em silêncio
 * antes: rodam de novo (a sessão reinicia do zero), mas o resultado é
 * descartado — nem saída nem imagem sua mudam no texto.
 *
 * Existe para quando só um bloco entre vários precisa ser corrigido: rodar
 * tudo de novo geraria uma imagem nova (e órfã) para cada gráfico que já
 * estava certo.
 */
export async function bakeSinglePythonBlock(content: string, line: number, opts: BakeOptions): Promise<string> {
  const matches = [...content.matchAll(BLOCK_RE)];
  const targetIndex = matches.findIndex((m) => lineAt(content, m.index ?? 0) === line);
  if (targetIndex === -1) return content;

  resetPythonSession();

  for (let i = 0; i < targetIndex; i++) {
    await runPython(matches[i][2]);
  }

  const [full, lang, code] = matches[targetIndex];
  const replacement = await renderBlock(lang, code, opts.onProgress, opts.uploadImage);

  const start = matches[targetIndex].index ?? 0;
  return content.slice(0, start) + replacement + content.slice(start + full.length);
}

/**
 * Linha (1-based) onde cada bloco ```python do texto começa, na ordem em que
 * aparecem — o botão de rodar, flutuando sobre o textarea, usa isto para
 * saber onde se posicionar.
 */
export function findPythonBlockLines(content: string): number[] {
  return [...content.matchAll(BLOCK_RE)].map((m) => lineAt(content, m.index ?? 0));
}
