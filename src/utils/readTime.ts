/**
 * Estimativa de tempo de leitura a partir do conteúdo em Markdown.
 *
 * Base de 200 palavras por minuto — média para leitura técnica em português.
 * Blocos de código são descontados: quem lê um artigo raramente lê o código
 * linha a linha, e sem esse desconto um post com um script longo passaria a
 * anunciar "15 min" indevidamente.
 */
const WORDS_PER_MINUTE = 200;

export function estimateReadTime(content: string, language: "pt" | "en" = "pt"): string {
  if (!content || !content.trim()) {
    return language === "en" ? "1 min read" : "1 min de leitura";
  }

  const prose = content
    .replace(/```[\s\S]*?```/g, " ")   // blocos de código
    .replace(/`[^`]*`/g, " ")          // código inline
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // imagens
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links: mantém só o texto
    .replace(/[#>*_~-]/g, " ");

  const words = prose.split(/\s+/).filter((word) => word.length > 0).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

  return language === "en" ? `${minutes} min read` : `${minutes} min de leitura`;
}
