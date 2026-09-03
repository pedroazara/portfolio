import React, { useState } from "react";
import { Project, ProjectCategory } from "../types";
import { Language } from "../lib/translations";
import { slugOf } from "../utils/slug";
import { useLocalePath } from "../lib/routes";
import { agruparPorCategoria } from "../utils/elevatorPitch";
import LocalImage from "./LocalImage";

interface PitchProjectsSlideProps {
  projects: Project[];
  categories: ProjectCategory[];
  /** Só estes `id`s aparecem — a curadoria feita no painel de edição. */
  selectedIds: string[];
  language?: Language;
}

/**
 * Slide de projetos do elevator pitch: cartões agrupados por área, com um
 * painel de prévia que segue o mouse e abre o projeto de verdade num clique.
 *
 * Uma lista de texto não mostra o trabalho — uma grade de cartões que se pode
 * apontar durante a fala, sim. O clique abre em nova aba para não perder o
 * lugar na apresentação.
 */
export default function PitchProjectsSlide({ projects, categories, selectedIds, language = "pt" }: PitchProjectsSlideProps) {
  const lp = useLocalePath();
  const isEn = language === "en";

  const selecionados = new Set(selectedIds);
  const visiveis = projects.filter((p) => selecionados.has(p.id));
  const [hover, setHover] = useState<Project | null>(visiveis[0] || null);

  const grupos = agruparPorCategoria(visiveis, categories);

  const abrirProjeto = (p: Project) => {
    window.open(lp(`/project/${slugOf(p)}`), "_blank", "noopener,noreferrer");
  };

  const Cartao = ({ p }: { p: Project }) => (
    <button
      type="button"
      onMouseEnter={() => setHover(p)}
      onFocus={() => setHover(p)}
      onClick={() => abrirProjeto(p)}
      className={`group overflow-hidden rounded-xl border text-left transition-all ${
        hover?.id === p.id
          ? "border-indigo-500 shadow-md"
          : "border-slate-200 hover:border-indigo-400 dark:border-slate-800"
      }`}
    >
      <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
        {p.imageUrl && (
          <LocalImage
            src={p.imageUrl}
            alt={p.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
          {(isEn && p.titleEn) || p.title}
        </p>
      </div>
    </button>
  );

  const stackDoHover = hover ? (hover.stack || hover.technologies || hover.tags || []) : [];

  if (visiveis.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-600">
        {isEn
          ? "No projects selected yet — pick some in the editor."
          : "Nenhum projeto selecionado ainda — escolha no editor."}
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-h-0 space-y-6 overflow-y-auto pr-1">
        {grupos.map(({ categoria, itens }) => (
          <div key={categoria?.id || "sem-categoria"}>
            <h3 className="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {categoria
                ? (isEn && categoria.nameEn) || categoria.name
                : isEn ? "Other projects" : "Outros projetos"}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {itens.map((p) => (
                <Cartao key={p.id} p={p} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Painel de prévia: mostra o último projeto apontado. */}
      <div className="hidden overflow-y-auto rounded-2xl border border-slate-200 p-4 dark:border-slate-800 lg:block">
        {hover ? (
          <>
            {hover.imageUrl && (
              <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                <LocalImage src={hover.imageUrl} alt={hover.title} className="h-full w-full object-cover" />
              </div>
            )}
            <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {(isEn && hover.titleEn) || hover.title}
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {(isEn && hover.descriptionEn) || hover.description}
            </p>
            {stackDoHover.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {stackDoHover.slice(0, 6).map((t) => (
                  <span
                    key={t}
                    className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-600">
              {isEn ? "Click the card to open it in a new tab." : "Clique no cartão para abrir em nova aba."}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-600">
            {isEn ? "Hover a project to preview it here." : "Passe o mouse sobre um projeto para ver aqui."}
          </p>
        )}
      </div>
    </div>
  );
}
