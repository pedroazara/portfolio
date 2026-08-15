/**
 * Proporção única das imagens de capa.
 *
 * O enquadramento produz um arquivo nesta proporção, e todos os lugares que
 * exibem uma capa usam a mesma — cartão da grade e topo da página de artigo e
 * de projeto. É isso que faz o quadro escolhido no editor ser exatamente o que
 * aparece no site.
 *
 * Antes cada ponto definia sua própria altura: o recorte saía 16:9, mas a capa
 * do topo usava altura fixa com largura total, o que dava uma proporção
 * diferente a cada tamanho de tela e cortava o enquadramento de novo. Manter o
 * valor num só lugar impede que isso volte a acontecer sem alarde.
 */

/** Razão largura/altura das capas. */
export const COVER_ASPECT = 16 / 9;

/** Classe utilitária correspondente, para os contêineres de exibição. */
export const COVER_ASPECT_CLASS = "aspect-video";

/** Largura do arquivo gerado pelo enquadramento, em pixels. */
export const COVER_OUTPUT_WIDTH = 1600;
