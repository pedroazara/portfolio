import React, { useState } from "react";
import { Users, Plus, Edit2, Trash2, ExternalLink } from "lucide-react";
import { AcademicActivity, Project } from "../types";
import EditModal from "./EditModal";
import MarkdownRenderer from "./MarkdownRenderer";
import TranslateButton from "./TranslateButton";
import ProjetosRelacionados from "./ProjetosRelacionados";
import { ReorderableList } from "./Reorderable";
import { SECTION_CARD_CLASS } from "../lib/cardStyle";
import { Language } from "../lib/translations";
import { autoTranslateFields } from "../lib/translator";
import { formatarPeriodo } from "../lib/periodo";

interface AtividadesCardProps {
  academicActivities: AcademicActivity[];
  projects: Project[];
  isEditMode: boolean;
  onUpdateAcademicActivities?: (updated: AcademicActivity[]) => void;
  language?: Language;
  /** Pede a confirmação de exclusão ao dono do modal compartilhado. */
  pedirConfirmacao: (titulo: string, mensagem: string, acao: () => void) => void;
}

/**
 * Atividades acadêmicas: a lista e o formulário que a edita.
 *
 * Segunda das três seções que dividiam um arquivo só. Diferente da formação,
 * uma atividade pode citar projetos pelo código — daí `projects` entre as
 * propriedades, para os chips virarem links.
 */
export default function AtividadesCard({
  academicActivities,
  projects,
  isEditMode,
  onUpdateAcademicActivities,
  language = "pt",
  pedirConfirmacao,
}: AtividadesCardProps) {
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
  const [isActModalOpen, setIsActModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<AcademicActivity | null>(null);
  const [actForm, setActForm] = useState<Partial<AcademicActivity>>({
    name: "",
    nameEn: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
    descriptionEn: "",
    extraContent: "",
    extraContentEn: "",
  });

  const handleAutoTranslateAct = async () => {
    await autoTranslateFields(
      {
        nameEn: actForm.name || "",
        descriptionEn: actForm.description || "",
        extraContentEn: actForm.extraContent || "",
      },
      setActForm
    );
    setEditingLanguage("en");
  };

  const handleOpenActAdd = () => {
    setEditingAct(null);
    setActForm({
      name: "",
      nameEn: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
      descriptionEn: "",
      extraContent: "",
      extraContentEn: "",
      projetos: [],
    });
    setEditingLanguage(language);
    setIsActModalOpen(true);
  };

  const handleOpenActEdit = (act: AcademicActivity) => {
    setEditingAct(act);
    setActForm({ ...act, projetos: act.projetos || [] });
    setEditingLanguage(language);
    setIsActModalOpen(true);
  };

  const handleDeleteAct = (id: string) => {
    pedirConfirmacao(
      language === "en" ? "Delete Academic Activity" : "Excluir Atividade Acadêmica",
      language === "en"
        ? "Are you sure you want to delete this activity?"
        : "Deseja realmente excluir esta atividade acadêmica?",
      () => {
        if (onUpdateAcademicActivities) {
          onUpdateAcademicActivities(academicActivities.filter((a) => a.id !== id));
        }
      }
    );
  };

  const handleActSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const complete: AcademicActivity = {
      id: editingAct?.id || `act-${Date.now()}`,
      name: actForm.name || "Atividade",
      nameEn: actForm.nameEn || "",
      startDate: actForm.startDate || "",
      endDate: actForm.current ? "" : actForm.endDate || "",
      current: actForm.current || false,
      description: actForm.description || "",
      descriptionEn: actForm.descriptionEn || "",
      extraContent: actForm.extraContent || "",
      extraContentEn: actForm.extraContentEn || "",
      projetos: actForm.projetos || [],
    };

    if (onUpdateAcademicActivities) {
      if (editingAct) {
        onUpdateAcademicActivities(
          academicActivities.map((item) => (item.id === editingAct.id ? complete : item))
        );
      } else {
        onUpdateAcademicActivities([...academicActivities, complete]);
      }
    }
    setIsActModalOpen(false);
  };

  return (
    <>
      {/* SEÇÃO 2: ATIVIDADES ACADÊMICAS (Academic Activities Grid) */}
      {(academicActivities.length > 0 || isEditMode) && (
        <section
          id="atividades-academicas"
          className={SECTION_CARD_CLASS}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/50 p-2.5 text-indigo-600 dark:text-indigo-400 print-border">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                  {language === "en" ? "Academic Activities" : "Atividades acadêmicas"}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                  {language === "en"
                    ? "Study groups, tutoring, and extension projects"
                    : "Núcleos de estudo e atividades extracurriculares"}
                </p>
              </div>
            </div>

            {isEditMode && (
              <button
                onClick={handleOpenActAdd}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 no-print print:hidden cursor-pointer"
                id="add-academic-act-btn"
              >
                <Plus className="h-3.5 w-3.5" />
                {language === "en" ? "Add" : "Adicionar"}
              </button>
            )}
          </div>

          {academicActivities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center font-sans">
              <Users className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-500 font-medium">
                Nenhuma atividade acadêmica cadastrada.
              </p>
            </div>
          ) : (
            <ReorderableList
              items={academicActivities}
              isEditMode={isEditMode}
              onReorder={(newOrder) => onUpdateAcademicActivities?.(newOrder)}
              getKey={(act) => act.id}
              className="space-y-4"
              itemClassName="group relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 p-5 sm:p-6 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
            >
              {(act, dragHandle) => {
                const actName = language === "en" && act.nameEn ? act.nameEn : act.name;
                const actDesc = language === "en" && act.descriptionEn ? act.descriptionEn : act.description;
                const actExtra = language === "en" && act.extraContentEn ? act.extraContentEn : act.extraContent;
                const hasExtra = (actExtra && actExtra.trim().length > 0) || (act.links && act.links.length > 0);

                return (
                  <div className="flex items-start gap-2">
                    {dragHandle && (
                      <div className="mt-1 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity">
                        {dragHandle}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-[15px] font-medium text-slate-900 dark:text-white font-sans leading-snug">
                            {actName}
                          </h3>
                          {actDesc && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                              {actDesc}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
                          <div className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                            {formatarPeriodo(act.startDate, act.endDate, act.current, language)}
                          </div>

                          {isEditMode && (
                            <div className="flex items-center gap-1 no-print print:hidden">
                              <button
                                onClick={() => handleOpenActEdit(act)}
                                className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                title="Editar Atividade" aria-label="Editar Atividade"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAct(act.id)}
                                className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                title="Excluir Atividade" aria-label="Excluir Atividade"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {hasExtra && (
                        <div className="mt-3.5 pt-3 border-t border-slate-200/70 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-sans space-y-2">
                          {actExtra && <p>{actExtra}</p>}
                          {act.links && act.links.length > 0 && (
                            <div className="flex flex-wrap gap-3 pt-1">
                              {act.links.map((link, idx) => (
                                <a
                                  key={idx}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                >
                                  <span>{link.title}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Projetos Relacionados (ETAPA 9.4) */}
                      <ProjetosRelacionados projectCodes={act.projetos} projects={projects} isEditMode={isEditMode} language={language} />
                    </div>
                  </div>
                );
              }}
            </ReorderableList>
          )}
        </section>
      )}

      {/* --- ACADEMIC ACTIVITY MODAL --- */}
      <EditModal
        isOpen={isActModalOpen}
        onClose={() => setIsActModalOpen(false)}
        title={
          editingAct
            ? language === "en" ? "Edit Academic Activity" : "Editar Atividade Acadêmica"
            : language === "en" ? "Add Academic Activity" : "Adicionar Atividade Acadêmica"
        }
      >
        <form onSubmit={handleActSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Atividade *
            </label>
            <input
              type="text"
              required
              value={actForm.name || ""}
              onChange={(e) => setActForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Nexus / Monitoria / Projeto de extensão"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data/Ano Inicial
              </label>
              <input
                type="text"
                value={actForm.startDate || ""}
                onChange={(e) => setActForm((prev) => ({ ...prev, startDate: e.target.value }))}
                placeholder="2024"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data/Ano Final
              </label>
              <input
                type="text"
                disabled={actForm.current}
                value={actForm.current ? "" : actForm.endDate || ""}
                onChange={(e) => setActForm((prev) => ({ ...prev, endDate: e.target.value }))}
                placeholder="2025"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="act-current"
              checked={actForm.current || false}
              onChange={(e) => setActForm((prev) => ({ ...prev, current: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600"
            />
            <label htmlFor="act-current" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              Atividade atual (presente)
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descrição Curta (Linha única por design) *
            </label>
            <input
              type="text"
              required
              value={actForm.description || ""}
              onChange={(e) => setActForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Coordenação do grupo de estudos"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Conteúdo Extra (Opcional — habilita expansão do bloco)
            </label>
            <textarea
              rows={3}
              value={actForm.extraContent || ""}
              onChange={(e) => setActForm((prev) => ({ ...prev, extraContent: e.target.value }))}
              placeholder="Detalhes adicionais, projetos ou links relacionados..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          {/* Linkar Projetos Relacionados */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {language === "en" ? "Link Related Projects" : "Linkar Projetos Relacionados"}
            </label>
            
            {projects.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {projects.map((p) => {
                  const pIdentifier = p.codigo || p.id;
                  const isSelected = (actForm.projetos || []).includes(pIdentifier);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const currentProjs = actForm.projetos || [];
                        const updatedProjs = isSelected
                          ? currentProjs.filter((id) => id !== pIdentifier)
                          : [...currentProjs, pIdentifier];
                        setActForm((prev) => ({ ...prev, projetos: updatedProjs }));
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {language === "en" && p.titleEn ? p.titleEn : p.title}
                    </button>
                  );
                })}
              </div>
            )}

            <input
              type="text"
              value={(actForm.projetos || []).join(", ")}
              onChange={(e) => {
                const val = e.target.value;
                const parsed = val.split(",").map((s) => s.trim()).filter(Boolean);
                setActForm((prev) => ({ ...prev, projetos: parsed }));
              }}
              placeholder="Códigos de projetos separados por vírgula (ex: yolocraft, laser-sim)"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white font-mono text-[11px]"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              {language === "en"
                ? "Click project pills above or type project codes separated by commas."
                : "Clique nas pílulas acima ou digite os códigos dos projetos separados por vírgula."}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsActModalOpen(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </form>
      </EditModal>
    </>
  );
}
