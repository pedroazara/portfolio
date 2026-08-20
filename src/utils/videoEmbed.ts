/**
 * Reconhecimento de links de vídeo dentro do Markdown.
 *
 * O autor cola a URL do YouTube como ela vem da barra de endereços — em
 * qualquer um dos formatos que o site usa (`watch?v=`, `youtu.be`, `shorts`,
 * `live`, `embed`) — e o renderizador troca o link por um player. Aqui fica só
 * a parte pura: identificar o vídeo e montar o endereço do player.
 */

export interface YouTubeVideo {
  /** Identificador de 11 caracteres do vídeo. */
  id: string;
  /** Segundo inicial, quando a URL traz `t` ou `start`. */
  start?: number;
  /** Endereço pronto para o `src` do iframe. */
  embedUrl: string;
  /** Endereço original, usado no link de escape ("assistir no YouTube"). */
  watchUrl: string;
  /**
   * Vídeo em pé (Shorts).
   *
   * Um Shorts dentro de uma moldura 16:9 vira uma tira estreita entre duas
   * tarjas pretas — no celular, quase nada de imagem. A proporção correta
   * muda a moldura, não o vídeo.
   */
  portrait: boolean;
}

const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be",
]);

/** Caminhos que carregam o id logo depois do nome. */
const PATH_PREFIXES = ["embed", "shorts", "live", "v"];

const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Converte o parâmetro de tempo em segundos.
 *
 * O YouTube aceita tanto `t=90` quanto `t=1m30s`, e o player só entende o
 * primeiro formato.
 */
function parseStart(raw: string | null): number | undefined {
  if (!raw) return undefined;

  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return seconds > 0 ? seconds : undefined;
  }

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw.trim().toLowerCase());
  if (!match || (!match[1] && !match[2] && !match[3])) return undefined;

  const total =
    Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  return total > 0 ? total : undefined;
}

/**
 * Extrai o vídeo de uma URL do YouTube, ou `null` se o link for outra coisa.
 *
 * Só devolve algo quando o id tem a forma esperada: um link de playlist ou de
 * canal continua sendo um link comum, e não vira um player quebrado.
 */
export function parseYouTubeUrl(raw: string): YouTubeVideo | null {
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const portrait = segments[0] === "shorts";
  let id: string | undefined;

  if (url.hostname.toLowerCase().endsWith("youtu.be")) {
    id = segments[0];
  } else if (segments[0] === "watch") {
    id = url.searchParams.get("v") || undefined;
  } else if (segments.length >= 2 && PATH_PREFIXES.includes(segments[0])) {
    id = segments[1];
  }

  if (!id || !ID_PATTERN.test(id)) return null;

  const start = parseStart(url.searchParams.get("t") || url.searchParams.get("start"));
  const params = new URLSearchParams({ rel: "0" });
  if (start) params.set("start", String(start));

  return {
    id,
    start,
    portrait,
    // O domínio `-nocookie` evita gravar rastreio antes de o visitante dar play.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}` : ""}`,
  };
}

/** Atalho para "esta string inteira é um link de vídeo". */
export function isYouTubeUrl(raw: string): boolean {
  return parseYouTubeUrl(raw) !== null;
}
