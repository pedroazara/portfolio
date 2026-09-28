/**
 * Geometria do traço de sinal da abertura: um pacote de onda — portadora sob
 * um envelope gaussiano — sobre uma linha de base. Usada pelo componente
 * `SinalPulso` e pela imagem de compartilhamento (scripts/og-image.ts), para
 * os dois desenharem o mesmo traço.
 */

/**
 * A portadora anda mais devagar que o envelope: as franjas escorregam por
 * dentro do pacote enquanto ele se move — velocidade de fase e de grupo não
 * são a mesma coisa.
 */
const FASE_POR_GRUPO = 0.6;

export const limitar = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));

/** Caminhos SVG da portadora e das duas bordas do envelope, com o pacote centrado em `centro`. */
export function tracarPulso(largura: number, altura: number, centro: number) {
  const meio = altura / 2;
  const amplitude = altura * 0.4;
  const sigma = limitar(largura * 0.05, 26, 64);
  const lambda = limitar(largura * 0.018, 11, 22);
  const envelope = (x: number) => Math.exp(-((x - centro) ** 2) / (2 * sigma * sigma));

  let portadora = "";
  for (let x = 0; ; x = Math.min(x + 2, largura)) {
    const y = meio - amplitude * envelope(x) * Math.cos((2 * Math.PI * (x - FASE_POR_GRUPO * centro)) / lambda);
    portadora += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(2)}`;
    if (x === largura) break;
  }

  // O envelope só existe perto do pacote; fora dele, cairia em cima da linha de base.
  const inicio = Math.max(0, Math.floor(centro - 3.5 * sigma));
  const fim = Math.min(largura, Math.ceil(centro + 3.5 * sigma));
  let superior = "";
  let inferior = "";
  for (let x = inicio; x <= fim; x += 2) {
    const a = amplitude * envelope(x);
    const comando = x === inicio ? "M" : "L";
    superior += `${comando}${x} ${(meio - a).toFixed(2)}`;
    inferior += `${comando}${x} ${(meio + a).toFixed(2)}`;
  }

  return { portadora, superior, inferior };
}

/** Marcas do eixo: uma a cada 16 px, maior a cada cinco — como a graduação de um osciloscópio. */
export function marcasDoEixo(largura: number) {
  const marcas: { x: number; meia: number }[] = [];
  for (let x = 0, i = 0; x <= largura; x += 16, i++) marcas.push({ x: x + 0.5, meia: i % 5 === 0 ? 6 : 3 });
  return marcas;
}
