import React from "react";
import { Check } from "lucide-react";
import { Project, ProjectCategory } from "../types";
import { Language } from "../lib/translations";
import { agruparPorCategoria } from "../utils/elevatorPitch";
import LocalImage from "./LocalImage";

interface PitchProjectPickerProps {
  projects: Project[];
  categories: ProjectCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  language?: Language;
}

/**
 * Checklist de curadoria: quais projetos entram no slide de destaques do
 * elevator pitch. Rascunhos ficam de fora — não têm página pública para o
 * clique do modo apresentação abrir.
 */
export default function PitchProjectPicker({
  projects,
  categories,
  selectedIds,
  onChange,
  language = "pt",
}: PitchProjectPickerProps) {
  const isEn = language === "en";
  const visiveis = projects.filter((p) => !p.draft);
  const grupos = agruparPorCategoria(visiveis, categories);
  const selecionados = new Set(selectedIds);

  const alternar = (id: string) => {
    onChange(selecionados.has(id) ? selectedIds.filter((atual) => atual !== id) : [...selectedIds, id]);
  };

  if (visiveis.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-600">
        {isEn ? "No published projects to choose from yet." : "Ainda não há projetos publicados para escolher."}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {grupos.map(({ categoria, itens }) => (
        <div key={categoria?.id || "sem-categoria"}>
          <h4 className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {categoria
              ? (isEn && categoria.nameEn) || categoria.name
              : isEn ? "Other projects" : "Outros projetos"}
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {itens.map((p) => {
              const marcado = selecionados.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => alternar(p.id)}
                  className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition-colors ${
                    marcado
                      ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/30"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      marcado ? "border-indigo-600 bg-indigo-600" : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {marcado && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="h-9 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-900">
                    {p.imageUrl && (
                      <LocalImage src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {(isEn && p.titleEn) || p.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
