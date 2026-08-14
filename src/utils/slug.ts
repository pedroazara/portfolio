/**
 * Resolução de itens a partir do trecho de URL.
 *
 * Projetos e artigos têm dois identificadores: o `id` interno (`proj-portfolio`)
 * e o `codigo`, um slug legível usado nos links (`portfolio-site`). Misturar os
 * dois é o que quebrava a abertura de projetos: o clique navegava com o código
 * e a busca comparava com o id.
 *
 * A regra passa a ser: os links usam `codigo` quando existe, e a busca aceita
 * qualquer um dos dois — assim links antigos baseados em `id` continuam válidos.
 */

interface Identifiable {
  id: string;
  codigo?: string;
}

/** Trecho de URL que representa este item. */
export function slugOf(item: Identifiable): string {
  return item.codigo || item.id;
}

/** Localiza um item pelo `codigo` ou pelo `id`. */
export function findBySlug<T extends Identifiable>(items: T[], slug: string | null | undefined): T | null {
  if (!slug) return null;
  return items.find((item) => item.codigo === slug) || items.find((item) => item.id === slug) || null;
}
