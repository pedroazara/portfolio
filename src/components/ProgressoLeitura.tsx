import React, { useEffect, useRef } from "react";

interface ProgressoLeituraProps {
  /** O bloco cujo avanço de leitura a barra mede — o corpo do artigo, não a página inteira. */
  targetRef: React.RefObject<HTMLElement>;
}

/**
 * Fio fino no topo da tela, marcando quanto falta do texto.
 *
 * Fica fora do cabeçalho de propósito: o cabeçalho recolhe ao rolar para
 * baixo — exatamente quando se está lendo —, e uma barra presa a ele
 * desapareceria no momento em que mais serve. Um artigo de 8.800 caracteres
 * não dá nenhuma pista de quanto falta hoje; esta barra é essa pista.
 *
 * A largura vem da posição do bloco de leitura na tela, não de "porcentagem
 * da página": 0% quando o topo do texto toca o topo da janela, 100% quando o
 * fim do texto toca o fim da janela. Notas relacionadas, navegação entre
 * artigos e rodapé — tudo que vem depois do texto — não conta.
 */
export default function ProgressoLeitura({ targetRef }: ProgressoLeituraProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    const medir = () => {
      frame = 0;
      const el = targetRef.current;
      const barra = barRef.current;
      if (!el || !barra) return;

      const rect = el.getBoundingClientRect();
      const percorrer = rect.height - window.innerHeight;
      // Texto mais curto que a tela: some rolar não estica, é ligar/desligar
      // conforme o texto ainda está à vista ou já passou.
      const progresso = percorrer <= 0 ? (rect.top <= 0 ? 1 : 0) : Math.min(Math.max(-rect.top / percorrer, 0), 1);

      barra.style.width = `${progresso * 100}%`;
    };

    const pedirQuadro = () => {
      if (!frame) frame = requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", pedirQuadro, { passive: true });
    window.addEventListener("resize", pedirQuadro);
    return () => {
      window.removeEventListener("scroll", pedirQuadro);
      window.removeEventListener("resize", pedirQuadro);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetRef]);

  return (
    <div
      aria-hidden="true"
      className="no-print fixed inset-x-0 top-0 z-[55] h-[3px] bg-transparent print:hidden"
    >
      <div ref={barRef} className="h-full w-0 bg-acento transition-[width] duration-150 ease-out" />
    </div>
  );
}
