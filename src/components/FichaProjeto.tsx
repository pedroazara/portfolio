import React from "react";
import { Language } from "../lib/translations";

interface FichaProjetoProps {
  periodo?: string | null;
  emAndamento?: boolean;
  emPlanejamento?: boolean;
  situacao?: string | null;
  areas?: string[];
  tecnologias?: string[];
  minutosDeLeitura?: number;
  language?: Language;
}

const ROTULO = "font-mono text-[10px] font-bold uppercase tracking-widest text-tinta-fraca";

/**
 * Ficha técnica do projeto: os dados duros, lidos de relance.
 *
 * A página antes despejava tudo em pílulas sobre o título — áreas, situação e
 * todas as etiquetas com o mesmo peso, antes de qualquer palavra sobre o que o
 * projeto é. Aqui os mesmos dados viram uma ficha curta, no formato de folha
 * de especificação.
 *
 * São duas faixas porque são dois tipos de dado, e tratá-los igual foi o
 * primeiro erro: numa grade de células do mesmo tamanho, "8 min" ocupava a
 * altura inteira que "Instrumentação & Eletrônica, Análise de Dados" precisou,
 * e a lista de seis tecnologias ainda era cortada no fim.
 *
 * - Em cima, o que é curto e sempre cabe numa linha: período, situação,
 *   leitura. Ficam lado a lado, separados por espaço.
 * - Embaixo, o que é lista e cresce sem aviso: áreas e tecnologias, em
 *   etiquetas que quebram linha e ocupam a largura toda. Nada é truncado.
 *
 * Cada parte só existe se houver o que dizer — projeto sem período não deixa
 * um espaço vazio esperando ser preenchido.
 */
export default function FichaProjeto({
  periodo,
  emAndamento,
  emPlanejamento,
  situacao,
  areas = [],
  tecnologias = [],
  minutosDeLeitura,
  language = "pt",
}: FichaProjetoProps) {
  const isEn = language === "en";

  const curtos: { rotulo: string; valor: React.ReactNode }[] = [];

  if (periodo) {
    curtos.push({ rotulo: isEn ? "Period" : "Período", valor: periodo });
  }

  if (emAndamento || emPlanejamento || situacao) {
    curtos.push({
      rotulo: isEn ? "Status" : "Situação",
      valor: (
        <span className="inline-flex items-center gap-1.5">
          {emAndamento && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse no-print" />
          )}
          {!emAndamento && emPlanejamento && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500 no-print" />
          )}
          {emAndamento
            ? (isEn ? "In progress" : "Em andamento")
            : emPlanejamento
              ? (isEn ? "Planning" : "Em planejamento")
              : situacao}
        </span>
      ),
    });
  }

  if (minutosDeLeitura) {
    curtos.push({ rotulo: isEn ? "Reading" : "Leitura", valor: `${minutosDeLeitura} min` });
  }

  const listas: { rotulo: string; itens: string[] }[] = [];
  if (areas.length > 0) listas.push({ rotulo: isEn ? "Areas" : "Áreas", itens: areas });
  if (tecnologias.length > 0) {
    listas.push({ rotulo: isEn ? "Technologies" : "Tecnologias", itens: tecnologias });
  }

  if (curtos.length === 0 && listas.length === 0) return null;

  return (
    <div className="mt-7 overflow-hidden rounded-2xl border border-borda-suave">
      {curtos.length > 0 && (
        <dl className="flex flex-wrap gap-x-8 gap-y-3 bg-superficie px-4 py-3.5">
          {curtos.map((campo) => (
            <div key={campo.rotulo}>
              <dt className={ROTULO}>{campo.rotulo}</dt>
              <dd className="mt-0.5 whitespace-nowrap text-sm font-semibold text-tinta">
                {campo.valor}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {listas.map((lista) => (
        <dl
          key={lista.rotulo}
          className="flex flex-col gap-2 border-t border-borda-suave bg-superficie px-4 py-3.5 sm:flex-row sm:items-baseline sm:gap-4"
        >
          <dt className={`${ROTULO} sm:w-24 sm:shrink-0 sm:pt-1`}>{lista.rotulo}</dt>
          <dd className="flex min-w-0 flex-wrap gap-1.5">
            {lista.itens.map((item) => (
              <span
                key={item}
                className="rounded-md bg-superficie-alta px-2 py-0.5 font-mono text-[11px] text-tinta-suave print-border"
              >
                {item}
              </span>
            ))}
          </dd>
        </dl>
      ))}
    </div>
  );
}
