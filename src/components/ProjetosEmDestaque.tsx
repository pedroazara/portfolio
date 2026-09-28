import React from "react";
import { Link } from "react-router-dom";
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

/** Colunas pela quantidade: um ou dois projetos não ficam perdidos numa grade de três. */
const GRADE: Record<number, string> = {
  1: "max-w-xl",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
};

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
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h2 id="titulo-destaques" className="font-display text-2xl font-extrabold tracking-tight text-tinta sm:text-3xl">
            {isEn ? "Featured work" : "Trabalho em destaque"}
          </h2>
          <p className="mt-1 text-sm text-tinta-fraca">
            {isEn ? "A few projects worth a closer look." : "Alguns projetos que valem uma olhada mais de perto."}
          </p>
        </div>
        <Link
          to={localePath("/projetos", language)}
          className="hidden shrink-0 text-sm font-semibold text-acento-tinta underline-offset-4 hover:underline sm:inline"
        >
          {isEn ? "All projects" : "Todos os projetos"}
        </Link>
      </div>

      <div className={`grid grid-cols-1 gap-5 ${GRADE[escolhidos.length] ?? GRADE[3]}`}>
        {escolhidos.map((proj) => {
          const catIds = proj.categoryIds?.length ? proj.categoryIds : proj.categoryId ? [proj.categoryId] : [];
          const categoria = categories.find((c) => catIds.includes(c.id));
          const titulo = (isEn && proj.titleEn) || proj.title;
          const resumo = (isEn && proj.descriptionEn) || proj.description;

          return (
            <Link
              key={proj.id}
              to={localePath(`/projetos/${slugOf(proj)}`, language)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-borda bg-superficie transition-colors hover:border-borda-forte"
            >
              {/* Sem capa, o cartão fica só com o texto — melhor que uma caixa vazia. */}
              {proj.imageUrl && (
                <div className={`relative w-full overflow-hidden border-b border-borda-suave bg-superficie-alta ${COVER_ASPECT_CLASS}`}>
                  <LocalImage
                    src={proj.imageUrl}
                    alt={titulo}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col gap-1.5 p-5">
                {categoria && (
                  <span className="text-xs font-medium text-tinta-fraca">
                    {(isEn && categoria.nameEn) || categoria.name}
                  </span>
                )}
                <h3 className="font-display text-lg font-bold leading-snug text-tinta transition-colors group-hover:text-acento-tinta">
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
        className="mt-5 block text-center text-sm font-semibold text-acento-tinta underline-offset-4 hover:underline sm:hidden"
      >
        {isEn ? "All projects" : "Todos os projetos"}
      </Link>
    </section>
  );
}
