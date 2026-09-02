import React from "react";
import { Plus, Trash2, Link2 } from "lucide-react";
import { ExperienceLink } from "../types";
import { Language } from "../lib/translations";

interface ReferenciasEditorProps {
  value: ExperienceLink[];
  onChange: (value: ExperienceLink[]) => void;
  language?: Language;
}

/**
 * Lista editável de referências (título + link), para projetos e artigos.
 *
 * Mesma forma dos links de produção do currículo (`ExperienceLink`), mas em
 * lista livre — quantas fontes o texto precisar citar, não um par fixo de
 * campos como demo/repositório.
 */
export default function ReferenciasEditor({ value, onChange, language = "pt" }: ReferenciasEditorProps) {
  const refs = value || [];
  const isEn = language === "en";

  const updateRef = (index: number, patch: Partial<ExperienceLink>) => {
    onChange(refs.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRef = (index: number) => {
    onChange(refs.filter((_, i) => i !== index));
  };

  const addRef = () => {
    onChange([...refs, { title: "", url: "" }]);
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-xs font-bold uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
        <Link2 className="h-3.5 w-3.5" />
        {isEn ? "References" : "Referências"}
      </label>

      {refs.length > 0 && (
        <div className="space-y-2">
          {refs.map((ref, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center"
            >
              <input
                type="text"
                value={ref.title}
                onChange={(e) => updateRef(i, { title: e.target.value })}
                placeholder={isEn ? "Reference title" : "Título da referência"}
                className="w-full flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
              <input
                type="text"
                value={ref.url}
                onChange={(e) => updateRef(i, { url: e.target.value })}
                placeholder="https://..."
                className="w-full flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => removeRef(i)}
                aria-label={isEn ? "Remove reference" : "Remover referência"}
                className="flex shrink-0 items-center justify-center self-end rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 sm:self-auto dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRef}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:text-indigo-400"
      >
        <Plus className="h-3.5 w-3.5" />
        {isEn ? "Add reference" : "Adicionar referência"}
      </button>
    </div>
  );
}
