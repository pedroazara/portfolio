/**
 * Link de prévia de um rascunho.
 *
 * Serve para mandar um texto ainda não publicado a um orientador ou colega:
 * o endereço normal esconde rascunhos de quem não está editando, e este
 * carrega uma chave que os revela.
 *
 * O que a chave é, e o que ela não é: ela evita que um rascunho apareça por
 * acaso — a pessoa precisa do endereço e da chave. Ela não é uma barreira de
 * segurança: o documento com todo o conteúdo do site é legível por qualquer
 * um no Supabase (é assim que a página carrega sem login), então um rascunho
 * nunca foi um segredo de verdade. Para conteúdo que precise mesmo ficar
 * fora do alcance, o lugar é fora do site.
 */

/** Nome do parâmetro na URL. */
export const PREVIEW_PARAM = "previa";

interface ComPrevia {
  chavePrevia?: string;
  draft?: boolean;
}

/** Gera uma chave nova, curta o bastante para caber num link compartilhado. */
export function novaChavePrevia(): string {
  const aleatorio =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return aleatorio.slice(0, 12);
}

/** Lê a chave apresentada na URL atual. */
export function chaveDaUrl(search: string): string | null {
  return new URLSearchParams(search).get(PREVIEW_PARAM);
}

/** Diz se esta chave abre este rascunho. */
export function previaLiberada(item: ComPrevia | null | undefined, chave: string | null): boolean {
  if (!item || !chave || !item.chavePrevia) return false;
  return item.chavePrevia === chave;
}

/** Monta o endereço completo para compartilhar. */
export function linkDePrevia(caminho: string, chave: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}${caminho}?${PREVIEW_PARAM}=${encodeURIComponent(chave)}`;
}
