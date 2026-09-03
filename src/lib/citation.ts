import { Language } from "./translations";

export interface CitationSource {
  title: string;
  authorName: string;
  /** Ano de publicação, já como texto (ex.: "2026"). */
  year: string;
  /** Nome do site/veículo, como aparece na aba do navegador (ex.: "Blog de Fulano"). */
  siteName: string;
  url: string;
}

/** Primeiro grupo de 4 dígitos encontrado, ou o ano corrente na ausência de um. */
export function extractYear(value?: string): string {
  const match = value?.match(/\d{4}/);
  return match ? match[0] : String(new Date().getFullYear());
}

/** "Pedro Henrique Almeida" vira "ALMEIDA, Pedro Henrique" — sobrenome primeiro, como pede a ABNT. */
function sobrenomePrimeiro(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length < 2) return nomeCompleto;
  const sobrenome = partes[partes.length - 1];
  const resto = partes.slice(0, -1).join(" ");
  return `${sobrenome.toUpperCase()}, ${resto}`;
}

/** ABNT (NBR 6023): o padrão ensinado nas universidades brasileiras para citar páginas web. */
export function citacaoAbnt(source: CitationSource): string {
  const { title, authorName, year, siteName, url } = source;
  const acesso = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  return `${sobrenomePrimeiro(authorName)}. ${title}. ${siteName}, ${year}. Disponível em: ${url}. Acesso em: ${acesso}.`;
}

/** APA (7th edition) — o padrão mais reconhecido internacionalmente. */
export function citacaoApa(source: CitationSource): string {
  const { title, authorName, year, siteName, url } = source;
  const acesso = new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });
  return `${authorName}. (${year}). ${title}. ${siteName}. Retrieved ${acesso}, from ${url}`;
}

/** Chave curta e estável para o registro BibTeX: sobrenome + ano + primeira palavra do título. */
function chaveBibtex(source: CitationSource): string {
  const partes = source.authorName.trim().split(/\s+/);
  const sobrenome = (partes[partes.length - 1] || "autor")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
  const primeiraPalavra = source.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 16);
  return `${sobrenome}${source.year}${primeiraPalavra}`;
}

/** BibTeX — para quem escreve em LaTeX; funciona em qualquer idioma. */
export function citacaoBibtex(source: CitationSource): string {
  const { title, authorName, year, siteName, url } = source;
  return [
    `@misc{${chaveBibtex(source)},`,
    `  author       = {${authorName}},`,
    `  title        = {${title}},`,
    `  howpublished = {${siteName}},`,
    `  year         = {${year}},`,
    `  url          = {${url}}`,
    `}`,
  ].join("\n");
}

/** As duas citações a mostrar: a de texto corrido no idioma da página, e o BibTeX. */
export function citacoesPara(source: CitationSource, language: Language) {
  return {
    texto: {
      rotulo: language === "en" ? "APA" : "ABNT",
      valor: language === "en" ? citacaoApa(source) : citacaoAbnt(source),
    },
    bibtex: citacaoBibtex(source),
  };
}
