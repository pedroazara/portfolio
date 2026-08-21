import React, { useState } from "react";
import { GraduationCap, Plus, Edit2, Trash2 } from "lucide-react";
import { Education } from "../types";
import EditModal from "./EditModal";
import MarkdownRenderer from "./MarkdownRenderer";
import TranslateButton from "./TranslateButton";
import { ReorderableList } from "./Reorderable";
import { SECTION_CARD_CLASS } from "../lib/cardStyle";
import { Language } from "../lib/translations";
import { autoTranslateFields } from "../lib/translator";
import { formatarPeriodo } from "../lib/periodo";

interface FormacaoCardProps {
  educations: Education[];
  isEditMode: boolean;
  onUpdateEducations: (updated: Education[]) => void;
  language?: Language;
  /** Pede a confirmação de exclusão ao dono do modal compartilhado. */
  pedirConfirmacao: (titulo: string, mensagem: string, acao: () => void) => void;
}

/**
 * Formação acadêmica: a lista e o formulário que a edita.
 *
 * Saiu de um arquivo de 1.600 linhas que reunia formação, pesquisa e
 * atividades acadêmicas — três listas independentes, cada uma com seu estado,
 * seu formulário e seu modal, que só dividiam o pedido de confirmação e o
 * formato de data. Separadas, cada mudança fica contida na seção que ela
 * afeta.
 *
 * O idioma em edição é local: alternar PT/EN aqui não mexe nos formulários
 * das outras seções, que antes compartilhavam o mesmo estado.
 */
export default function FormacaoCard({
  educations,
  isEditMode,
  onUpdateEducations,
  language = "pt",
  pedirConfirmacao,
}: FormacaoCardProps) {
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [eduForm, setEduForm] = useState<Partial<Education>>({
    institution: "",
    degree: "",
    degreeEn: "",
    fieldOfStudy: "",
    fieldOfStudyEn: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
    descriptionEn: "",
  });

  const handleAutoTranslateEdu = async () => {
    await autoTranslateFields(
      {
        degreeEn: eduForm.degree || "",
        institutionEn: eduForm.institution || "",
        fieldOfStudyEn: eduForm.fieldOfStudy || "",
        descriptionEn: eduForm.description || "",
      },
      setEduForm
    );
    setEditingLanguage("en");
  };

  const handleOpenEduAdd = () => {
    setEditingEdu(null);
    setEduForm({
      institution: "",
      degree: "",
      degreeEn: "",
      fieldOfStudy: "",
      fieldOfStudyEn: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
      descriptionEn: "",
    });
    setEditingLanguage(language);
    setIsEduModalOpen(true);
  };

  const handleOpenEduEdit = (edu: Education) => {
    setEditingEdu(edu);
    setEduForm({ ...edu });
    setEditingLanguage(language);
    setIsEduModalOpen(true);
  };

  const handleDeleteEdu = (id: string) => {
    pedirConfirmacao(
      language === "en" ? "Delete Education" : "Excluir Formação",
      language === "en"
        ? "Are you sure you want to delete this academic background?"
        : "Deseja realmente excluir esta formação acadêmica?",
      () => {
        onUpdateEducations(educations.filter((e) => e.id !== id));
      }
    );
  };

  const handleEduSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const complete: Education = {
      id: editingEdu?.id || `edu-${Date.now()}`,
      institution: eduForm.institution || "Instituição",
      degree: eduForm.degree || "Grau",
      degreeEn: eduForm.degreeEn || "",
      fieldOfStudy: eduForm.fieldOfStudy || "Curso",
      fieldOfStudyEn: eduForm.fieldOfStudyEn || "",
      startDate: eduForm.startDate || "",
      endDate: eduForm.current ? "" : eduForm.endDate || "",
      current: eduForm.current || false,
      description: eduForm.description || "",
      descriptionEn: eduForm.descriptionEn || "",
    };

    if (editingEdu) {
      onUpdateEducations(educations.map((item) => (item.id === editingEdu.id ? complete : item)));
    } else {
      onUpdateEducations([...educations, complete]);
    }
    setIsEduModalOpen(false);
  };


  return (
    <>
      {/* SEÇÃO 1: FORMAÇÃO ACADÊMICA (Education Section) */}
      <section
        id="formacao"
        className={SECTION_CARD_CLASS}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/50 p-2.5 text-indigo-600 dark:text-indigo-400 print-border">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                {language === "en" ? "Academic Background" : "Formação Acadêmica"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                {language === "en"
                  ? "Degrees, higher education, and academic qualifications"
                  : "Graduações, pós-graduações e ensino superior"}
              </p>
            </div>
          </div>

          {isEditMode && (
            <button
              onClick={handleOpenEduAdd}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 no-print print:hidden cursor-pointer"
              id="add-education-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              {language === "en" ? "Add" : "Adicionar"}
            </button>
          )}
        </div>

        {educations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center font-sans">
            <GraduationCap className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500 font-medium">
              Nenhuma formação adicionada.
            </p>
          </div>
        ) : (
          <ReorderableList
            items={educations}
            isEditMode={isEditMode}
            onReorder={onUpdateEducations}
            getKey={(edu) => edu.id}
            className="space-y-6"
            itemClassName="group relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 p-5 sm:p-6 transition-all"
          >
            {(edu, dragHandle) => {
              const degreeText = language === "en" && edu.degreeEn ? edu.degreeEn : edu.degree;
              const fieldText = language === "en" && edu.fieldOfStudyEn ? edu.fieldOfStudyEn : edu.fieldOfStudy;
              const instText = language === "en" && edu.institutionEn ? edu.institutionEn : edu.institution;
              const descText = language === "en" && edu.descriptionEn ? edu.descriptionEn : edu.description;

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
                        <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                          {degreeText} em {fieldText}
                        </h3>
                        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 font-sans">
                          {instText}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                          {formatarPeriodo(edu.startDate, edu.endDate, edu.current, language)}
                        </div>

                        {isEditMode && (
                          <div className="flex items-center gap-1 no-print print:hidden">
                            <button
                              onClick={() => handleOpenEduEdit(edu)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                              title="Editar Formação" aria-label="Editar Formação"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEdu(edu.id)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Excluir Formação" aria-label="Excluir Formação"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {descText && (
                      <div className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-sans">
                        <MarkdownRenderer content={descText} className="text-xs text-slate-600 dark:text-slate-400 font-sans space-y-1" />
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          </ReorderableList>
        )}
      </section>

      {/* --- EDUCATION MODAL --- */}
      <EditModal
        isOpen={isEduModalOpen}
        onClose={() => setIsEduModalOpen(false)}
        title={
          editingEdu
            ? language === "en" ? "Edit Education" : "Editar Formação"
            : language === "en" ? "Add Education" : "Adicionar Formação"
        }
      >
        <form onSubmit={handleEduSubmit} className="space-y-4 text-xs font-sans">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingLanguage("pt")}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                  editingLanguage === "pt"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                Português
              </button>
              <button
                type="button"
                onClick={() => setEditingLanguage("en")}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                  editingLanguage === "en"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                English
              </button>
            </div>
            <TranslateButton
              onTranslate={handleAutoTranslateEdu}
              label={language === "en" ? "Auto-Translate PT → EN" : "Traduzir PT → EN (Gemini AI)"}
              size="sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Instituição {editingLanguage === "en" && "(English)"} {editingLanguage === "pt" && "*"}
            </label>
            <input
              type="text"
              required={editingLanguage === "pt"}
              value={editingLanguage === "en" ? eduForm.institutionEn || "" : eduForm.institution || ""}
              onChange={(e) =>
                setEduForm((prev) =>
                  editingLanguage === "en"
                    ? { ...prev, institutionEn: e.target.value }
                    : { ...prev, institution: e.target.value }
                )
              }
              placeholder="e.g. Universidade de São Paulo (USP)"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Grau {editingLanguage === "en" && "(English)"} {editingLanguage === "pt" && "*"}
              </label>
              <input
                type="text"
                required={editingLanguage === "pt"}
                value={editingLanguage === "en" ? eduForm.degreeEn || "" : eduForm.degree || ""}
                onChange={(e) =>
                  setEduForm((prev) =>
                    editingLanguage === "en"
                      ? { ...prev, degreeEn: e.target.value }
                      : { ...prev, degree: e.target.value }
                  )
                }
                placeholder="Bacharelado"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Curso / Área {editingLanguage === "en" && "(English)"} {editingLanguage === "pt" && "*"}
              </label>
              <input
                type="text"
                required={editingLanguage === "pt"}
                value={editingLanguage === "en" ? eduForm.fieldOfStudyEn || "" : eduForm.fieldOfStudy || ""}
                onChange={(e) =>
                  setEduForm((prev) =>
                    editingLanguage === "en"
                      ? { ...prev, fieldOfStudyEn: e.target.value }
                      : { ...prev, fieldOfStudy: e.target.value }
                  )
                }
                placeholder="Engenharia Física"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Início
              </label>
              <input
                type="text"
                value={eduForm.startDate || ""}
                onChange={(e) => setEduForm((prev) => ({ ...prev, startDate: e.target.value }))}
                placeholder="2022-03"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fim
              </label>
              <input
                type="text"
                disabled={eduForm.current}
                value={eduForm.current ? "" : eduForm.endDate || ""}
                onChange={(e) => setEduForm((prev) => ({ ...prev, endDate: e.target.value }))}
                placeholder="2027-12"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edu-current"
              checked={eduForm.current || false}
              onChange={(e) => setEduForm((prev) => ({ ...prev, current: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600"
            />
            <label htmlFor="edu-current" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              Em andamento
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descrição {editingLanguage === "en" && "(English)"}
            </label>
            <textarea
              rows={4}
              value={editingLanguage === "en" ? eduForm.descriptionEn || "" : eduForm.description || ""}
              onChange={(e) =>
                setEduForm((prev) =>
                  editingLanguage === "en"
                    ? { ...prev, descriptionEn: e.target.value }
                    : { ...prev, description: e.target.value }
                )
              }
              placeholder="Ênfase, disciplinas relevantes, TCC, menções honrosas, projetos de destaque..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEduModalOpen(false)}
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
