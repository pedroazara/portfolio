import React from "react";
import { Language } from "../lib/translations";

interface Campo {
  rotulo: string;
  valor: React.ReactNode;
}

interface FichaProjetoProps {
  periodo?: string | null;
  emAndamento?: boolean;
  situacao?: string | null;
  areas?: string[];
  tecnologias?: string[];
  minutosDeLeitura?: number;
  language?: Language;
}

/**
 * Ficha técnica do projeto: os dados duros, lidos de relance.
 *
 * A página antes despejava tudo em pílulas sobre o título — áreas, situação e
 * todas as etiquetas com o mesmo peso, antes de qualquer palavra sobre o que o
 * projeto é. Aqui os mesmos dados viram uma tabela curta, no formato de folha
 * de especificação: rótulo pequeno em versalete, valor abaixo.
 *
 * Cada célula só existe se houver o que dizer — projeto sem período não deixa
 * um espaço vazio esperando ser preenchido.
 */
export default function FichaProjeto({
  periodo,
  emAndamento,
  situacao,
  areas = [],
  tecnologias = [],
  minutosDeLeitura,
  language = "pt",
}: FichaProjetoProps) {
  const isEn = language === "en";

  const campos: Campo[] = [];

  if (periodo) {
    campos.push({ rotulo: isEn ? "Period" : "Período", valor: periodo });
  }

  if (emAndamento || situacao) {
    campos.push({
      rotulo: isEn ? "Status" : "Situação",
      valor: (
        <span className="inline-flex items-center gap-1.5">
          {emAndamento && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse no-print" />
          )}
          {emAndamento ? (isEn ? "In progress" : "Em andamento") : situacao}
        </span>
      ),
    });
  }

  if (areas.length > 0) {
    campos.push({ rotulo: isEn ? "Areas" : "Áreas", valor: areas.join(" · ") });
  }

  if (tecnologias.length > 0) {
    campos.push({
      rotulo: isEn ? "Technologies" : "Tecnologias",
      // Lista longa some no fim em vez de esticar a célula: as primeiras já
      // dizem do que o projeto é feito, e o texto traz o resto.
      valor: (
        <span className="line-clamp-2" title={tecnologias.join(", ")}>
          {tecnologias.join(" · ")}
        </span>
      ),
    });
  }

  if (minutosDeLeitura) {
    campos.push({
      rotulo: isEn ? "Reading" : "Leitura",
      valor: `${minutosDeLeitura} min`,
    });
  }

  if (campos.length === 0) return null;

  return (
    <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-borda-suave bg-borda-suave sm:grid-cols-3 lg:grid-cols-5">
      {campos.map((campo) => (
        <div key={campo.rotulo} className="bg-superficie px-4 py-3">
          <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-tinta-fraca">
            {campo.rotulo}
          </dt>
          <dd className="mt-1 text-sm font-semibold leading-snug text-tinta">{campo.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
