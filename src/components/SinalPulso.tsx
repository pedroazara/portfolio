import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { limitar, marcasDoEixo, tracarPulso } from "../lib/pulso";

interface SinalPulsoProps {
  /** Região em que o ponteiro conduz o pulso: a abertura inteira, e não só a faixa do traço. */
  areaRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

const ALTURA = 120;
const MEIO = ALTURA / 2;
/** Onde o pulso começa, em fração da largura, antes de o cursor passar pela faixa. */
const INICIO = 0.7;
/** Fração da distância restante percorrida a cada quadro. */
const SUAVIZACAO = 0.12;
/**
 * Passo máximo por quadro, em px. A suavização sozinha anda proporcional à
 * distância: se o cursor entra na faixa longe do pulso, ele atravessaria a
 * tela de uma vez. O teto faz o pulso deslizar até lá.
 */
const PASSO_MAXIMO = 22;

/**
 * O traço da abertura: um pacote de onda — a forma de um pulso de laser
 * ultracurto, ou de um surto de vibração num sensor — sobre um eixo graduado.
 *
 * É decoração, e se comporta como tal: fica fora da leitura de tela e do
 * papel, e só se move quando alguém passa o ponteiro pela abertura — ao
 * sair, o pulso fica onde parou; ao voltar, desliza até o cursor.
 * O desenho acontece uma vez, ao montar a página; com movimento reduzido,
 * o pulso aparece pronto e fica parado.
 */
export default function SinalPulso({ areaRef, className = "" }: SinalPulsoProps) {
  const reducedMotion = usePrefersReducedMotion();
  const caixaRef = useRef<HTMLDivElement>(null);
  const portadoraRef = useRef<SVGPathElement>(null);
  const superiorRef = useRef<SVGPathElement>(null);
  const inferiorRef = useRef<SVGPathElement>(null);
  const [largura, setLargura] = useState(0);
  // Posição do pulso em fração da largura, guardada fora do efeito: uma
  // mudança de largura redesenha o traço sem devolver o pulso ao início.
  const posicaoRef = useRef(INICIO);

  useEffect(() => {
    const caixa = caixaRef.current;
    if (!caixa) return;
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.round(entrada.contentRect.width)));
    observador.observe(caixa);
    return () => observador.disconnect();
  }, []);

  // Layout, e não efeito comum: o primeiro traço precisa estar no lugar antes
  // da pintura, ou a varredura começaria sobre um caminho vazio.
  useLayoutEffect(() => {
    if (!largura) return;
    let atual = posicaoRef.current * largura;
    let alvo = atual;
    let quadro = 0;

    const desenhar = (centro: number) => {
      posicaoRef.current = centro / largura;
      const { portadora, superior, inferior } = tracarPulso(largura, ALTURA, centro);
      portadoraRef.current?.setAttribute("d", portadora);
      superiorRef.current?.setAttribute("d", superior);
      inferiorRef.current?.setAttribute("d", inferior);
    };

    // O laço só roda enquanto o pulso está a caminho; ao chegar, para.
    const passo = () => {
      const falta = alvo - atual;
      if (Math.abs(falta) < 0.5) {
        atual = alvo;
        quadro = 0;
      } else {
        atual += limitar(falta * SUAVIZACAO, -PASSO_MAXIMO, PASSO_MAXIMO);
        quadro = requestAnimationFrame(passo);
      }
      desenhar(atual);
    };

    const mirar = (x: number) => {
      alvo = limitar(x, 0, largura);
      if (!quadro) quadro = requestAnimationFrame(passo);
    };

    desenhar(atual);

    const caixa = caixaRef.current;
    const area = areaRef.current;
    if (reducedMotion || !caixa || !area) return;

    // Sem `pointerleave`: ao sair da abertura, o alvo fica onde o cursor
    // estava por último, e o pulso para lá.
    const seguir = (evento: PointerEvent) => mirar(evento.clientX - caixa.getBoundingClientRect().left);

    area.addEventListener("pointermove", seguir);
    area.addEventListener("pointerdown", seguir);
    return () => {
      cancelAnimationFrame(quadro);
      area.removeEventListener("pointermove", seguir);
      area.removeEventListener("pointerdown", seguir);
    };
  }, [largura, reducedMotion, areaRef]);

  const marcas = marcasDoEixo(largura).map(({ x, meia }) => (
    <line key={x} x1={x} x2={x} y1={MEIO - meia} y2={MEIO + meia} />
  ));

  return (
    <div
      ref={caixaRef}
      aria-hidden="true"
      className={`pointer-events-none no-print print:hidden ${className}`}
      style={{ height: ALTURA }}
    >
      {largura > 0 && (
        <svg width={largura} height={ALTURA} viewBox={`0 0 ${largura} ${ALTURA}`} className="block overflow-visible">
          <g stroke="var(--borda-forte)" strokeWidth={1}>
            {marcas}
          </g>
          <g
            className={reducedMotion ? undefined : "sinal-envelope"}
            fill="none"
            stroke="var(--acento)"
            strokeOpacity={0.4}
            strokeWidth={1}
            strokeDasharray="2 4"
          >
            <path ref={superiorRef} />
            <path ref={inferiorRef} />
          </g>
          <path
            ref={portadoraRef}
            className={reducedMotion ? undefined : "sinal-varredura"}
            pathLength={1000}
            fill="none"
            stroke="var(--acento)"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}
