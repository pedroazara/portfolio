import React, { useEffect, useState } from "react";
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
  const [carrosselIndex, setCarrosselIndex] = useState(0);

  const grupos = agruparPorCategoria(visiveis, categories);

  const imagensDoHover = hover
    ? (() => {
        const galeria = Array.from(new Set((hover.galleryImages || hover.images || []).filter(Boolean))) as string[];
        return galeria.length > 0 ? galeria : hover.imageUrl ? [hover.imageUrl] : [];
      })()
    : [];

  useEffect(() => {
    setCarrosselIndex(0);
  }, [hover?.id]);

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
    <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
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
      <div className="hidden min-h-0 overflow-y-auto rounded-2xl border border-slate-200 p-4 dark:border-slate-800 lg:block">
        {hover ? (
          <>
            {imagensDoHover.length > 0 && (
              <div className="relative mb-4 h-56 overflow-hidden rounded-lg bg-slate-100 xl:h-60 dark:bg-slate-900">
                <LocalImage
                  key={imagensDoHover[carrosselIndex]}
                  src={imagensDoHover[carrosselIndex]}
                  alt={hover.title}
                  className="h-full w-full object-contain"
                />
                {imagensDoHover.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCarrosselIndex((i) => (i - 1 + imagensDoHover.length) % imagensDoHover.length)}
                      aria-label={isEn ? "Previous image" : "Imagem anterior"}
                      className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-sm text-white transition hover:bg-black/70"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => setCarrosselIndex((i) => (i + 1) % imagensDoHover.length)}
                      aria-label={isEn ? "Next image" : "Próxima imagem"}
                      className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-sm text-white transition hover:bg-black/70"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
                      {imagensDoHover.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCarrosselIndex(i)}
                          aria-label={`${isEn ? "Image" : "Imagem"} ${i + 1}`}
                          className={`h-1.5 w-1.5 rounded-full transition ${
                            i === carrosselIndex ? "bg-white" : "bg-white/50 hover:bg-white/75"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {(isEn && hover.titleEn) || hover.title}
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {(isEn && hover.descriptionEn) || hover.description}
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
