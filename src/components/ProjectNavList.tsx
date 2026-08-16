import React from "react";
import { Link } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { Project } from "../types";
import { Language } from "../lib/translations";
import { slugOf } from "../utils/slug";
import LocalImage from "./LocalImage";
import { useLocalePath } from "../lib/routes";

interface ProjectNavListProps {
  projects: Project[];
  /** Id do projeto em leitura, destacado e não clicável. */
  currentId: string;
  language?: Language;
}

/**
 * Navegador lateral entre projetos.
 *
 * Lista todos os projetos visíveis, marcando o atual — assim dá para pular de
 * um para outro sem voltar à grade.
 */
export default function ProjectNavList({ projects, currentId, language = "pt" }: ProjectNavListProps) {
  const lp = useLocalePath();
  if (projects.length <= 1) return null;

  return (
    <nav
      aria-label={language === "en" ? "Other projects" : "Outros projetos"}
      className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto no-print"
    >
      <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <FolderKanban className="h-3.5 w-3.5" />
        {language === "en" ? "Projects" : "Projetos"}
      </p>

      <ul className="space-y-1.5">
        {projects.map((proj) => {
          const isCurrent = proj.id === currentId;
          const title = (language === "en" && proj.titleEn ? proj.titleEn : proj.title) || proj.title;

          const inner = (
            <>
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                {proj.imageUrl ? (
                  <LocalImage src={proj.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FolderKanban className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  </div>
                )}
              </div>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-xs font-semibold leading-snug">{title}</span>
                {proj.draft && (
                  <span className="mt-0.5 block font-mono text-[10px] uppercase text-amber-600 dark:text-amber-400">
                    {language === "en" ? "Draft" : "Rascunho"}
                  </span>
                )}
              </span>
            </>
          );

          if (isCurrent) {
            return (
              <li key={proj.id}>
                <div
                  aria-current="page"
                  className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 p-2 text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200"
                >
                  {inner}
                </div>
              </li>
            );
          }

          return (
            <li key={proj.id}>
              <Link
                to={lp(`/project/${slugOf(proj)}`)}
                className="flex items-center gap-2.5 rounded-xl border border-transparent p-2 text-slate-600 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                {inner}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
