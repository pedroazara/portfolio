/**
 * Divide um texto em parágrafos nas linhas vazias.
 *
 * O campo de apresentação é um `<textarea>`: quem escreve separa os blocos com
 * uma ou mais linhas em branco, e é isso que conta como troca de parágrafo.
 * Uma quebra simples continua dentro do mesmo parágrafo.
 */
export function paragrafos(texto: string): string[] {
  return texto
    .split(/\n\s*\n/)
    .map((trecho) => trecho.trim())
    .filter(Boolean);
}
