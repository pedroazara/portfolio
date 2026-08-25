import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";
import { Project, ProjectCategory } from "../types";
import { Language } from "../lib/translations";
import { localePath } from "../lib/routes";
import { slugOf } from "../utils/slug";
import { COVER_ASPECT_CLASS } from "../lib/coverAspect";
import LocalImage from "./LocalImage";

interface ProjetosEmDestaqueProps {
  projects: Project[];
  categories: ProjectCategory[];
  language?: Language;
}

const MAXIMO = 3;

/**
 * A vitrine de trabalho na home: até três projetos, sem grade nem filtro.
 *
 * Quem marca um projeto como destaque no editor (o selo de estrela em
 * `ProjectForm`) decide o que aparece aqui — o campo já existia, só não tinha
 * onde ser lido. Sem nenhum marcado, os mais recentes preenchem o espaço, para
 * a home nunca abrir vazia.
 *
 * Cartões só de leitura, de propósito: a home é vitrine, não o lugar de
 * editar — isso continua em `/projetos` e no painel.
 */
export default function ProjetosEmDestaque({ projects, categories, language = "pt" }: ProjetosEmDestaqueProps) {
  const isEn = language === "en";

  const publicados = projects.filter((p) => !p.draft);
  const marcados = publicados.filter((p) => p.featured);
  const resto = publicados.filter((p) => !p.featured);
  const escolhidos = [...marcados, ...resto].slice(0, MAXIMO);

  if (escolhidos.length === 0) return null;

  return (
    <section aria-labelledby="titulo-destaques">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 id="titulo-destaques" className="font-display text-2xl font-black tracking-tight text-tinta">
            {isEn ? "Featured work" : "Trabalho em destaque"}
          </h2>
          <p className="mt-1 text-sm text-tinta-fraca">
            {isEn ? "A few projects worth a closer look." : "Alguns projetos que valem uma olhada mais de perto."}
          </p>
        </div>
        <Link
          to={localePath("/projetos", language)}
          className="group hidden shrink-0 items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-acento sm:inline-flex"
        >
          {isEn ? "All projects" : "Todos os projetos"}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {escolhidos.map((proj) => {
          const catIds = proj.categoryIds?.length ? proj.categoryIds : proj.categoryId ? [proj.categoryId] : [];
          const categoria = categories.find((c) => catIds.includes(c.id));
          const titulo = (isEn && proj.titleEn) || proj.title;
          const resumo = (isEn && proj.descriptionEn) || proj.description;

          return (
            <Link
              key={proj.id}
              to={localePath(`/projetos/${slugOf(proj)}`, language)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-borda-suave bg-superficie shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`relative w-full overflow-hidden bg-superficie-alta ${COVER_ASPECT_CLASS}`}>
                {proj.imageUrl ? (
                  <LocalImage
                    src={proj.imageUrl}
                    alt={titulo}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-tinta-fraca">
                    <Layers className="h-8 w-8" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1.5 p-4">
                {categoria && (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-acento">
                    {(isEn && categoria.nameEn) || categoria.name}
                  </span>
                )}
                <h3 className="font-display text-base font-bold leading-snug text-tinta transition-colors group-hover:text-acento">
                  {titulo}
                </h3>
                <p className="line-clamp-2 text-sm text-tinta-suave">{resumo}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        to={localePath("/projetos", language)}
        className="mt-5 flex items-center justify-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-acento sm:hidden"
      >
        {isEn ? "All projects" : "Todos os projetos"}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
