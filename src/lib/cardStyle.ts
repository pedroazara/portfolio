/**
 * A moldura das seções do currículo.
 *
 * Todas as seções são a mesma peça — um cartão claro sobre o fundo da página —
 * e antes cada arquivo repetia a lista de classes por conta própria, com
 * pequenas divergências que só apareciam lado a lado: uma borda em
 * `slate-200/80`, outra em `slate-100`, cantos de raios diferentes.
 *
 * Os dois enfeites vêm de pseudo-elementos, e não de `<div>`s: são decoração,
 * não conteúdo, e assim nenhuma seção precisa carregar marcação extra.
 *
 * - `before`: um fio de luz índigo na aresta de cima, que dá profundidade sem
 *   engrossar a borda.
 * - `after`: um halo frio no canto superior direito, o mesmo gesto do retrato
 *   da abertura, fraco o bastante para não competir com o texto.
 *
 * No papel os dois somem: tinta gasta à toa.
 */
export const SECTION_CARD_CLASS = [
  "scroll-mt-32 relative overflow-hidden rounded-3xl",
  // Tokens em vez do par claro/escuro: a variável troca com o tema, e o cartão
  // deixa de precisar saber que existe tema. Ver o vocabulário em index.css.
  "border border-borda-suave bg-superficie shadow-sm transition-colors duration-300",
  "p-6 sm:p-8 md:p-10",
  "print-border print-shadow-none print-m-0",
  // Fio de luz superior.
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:content-['']",
  "before:bg-gradient-to-r before:from-transparent before:via-indigo-500/40 before:to-transparent",
  "dark:before:via-indigo-400/50 print:before:hidden",
  // Halo do canto.
  "after:pointer-events-none after:absolute after:-right-24 after:-top-28 after:h-64 after:w-64 after:rounded-full after:content-['']",
  "after:bg-indigo-500/5 after:blur-3xl dark:after:bg-indigo-500/10 print:after:hidden",
].join(" ");
