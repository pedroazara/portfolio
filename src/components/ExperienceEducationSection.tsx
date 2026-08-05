import React, { useState } from "react";
import { Experience, Education } from "../types";
import { Briefcase, GraduationCap, Plus, Edit2, Trash2, Calendar, MapPin } from "lucide-react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import MarkdownRenderer from "./MarkdownRenderer";
import { Language, translations } from "../lib/translations";

interface ExperienceEducationSectionProps {
  experiences: Experience[];
  educations: Education[];
  isEditMode: boolean;
  onUpdateExperiences: (updated: Experience[]) => void;
  onUpdateEducations: (updated: Education[]) => void;
  language?: Language;
}

export default function ExperienceEducationSection({
  experiences,
  educations,
  isEditMode,
  onUpdateExperiences,
  onUpdateEducations,
  language = "pt",
}: ExperienceEducationSectionProps) {
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");

  // Confirm Modal States
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setConfirmOpen(true);
  };

  // Experience Modal States
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [expForm, setExpForm] = useState<Partial<Experience>>({
    company: "",
    role: "",
    roleEn: "",
    location: "",
    locationEn: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
    descriptionEn: "",
  });

  // Education Modal States
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

  // --- Experience Handlers ---
  const handleOpenExpAdd = () => {
    setEditingExp(null);
    setExpForm({
      company: "",
      role: "",
      roleEn: "",
      location: "",
      locationEn: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
      descriptionEn: "",
    });
    setEditingLanguage(language);
    setIsExpModalOpen(true);
  };

  const handleOpenExpEdit = (exp: Experience) => {
    setEditingExp(exp);
    setExpForm({ ...exp });
    setEditingLanguage(language);
    setIsExpModalOpen(true);
  };

  const handleDeleteExp = (id: string) => {
    triggerConfirm(
      language === "en" ? "Delete Experience" : "Excluir Experiência",
      language === "en" 
        ? "Are you sure you want to delete this professional experience?" 
        : "Deseja realmente excluir esta experiência profissional?",
      () => {
        onUpdateExperiences(experiences.filter((e) => e.id !== id));
      }
    );
  };

  const handleExpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const complete: Experience = {
      id: editingExp?.id || `exp-${Date.now()}`,
      company: expForm.company || "Empresa",
      role: expForm.role || "Cargo",
      roleEn: expForm.roleEn || "",
      location: expForm.location || undefined,
      locationEn: expForm.locationEn || undefined,
      startDate: expForm.startDate || "",
      endDate: expForm.current ? "" : expForm.endDate || "",
      current: expForm.current || false,
      description: expForm.description || "",
      descriptionEn: expForm.descriptionEn || "",
    };

    if (editingExp) {
      onUpdateExperiences(experiences.map((item) => (item.id === editingExp.id ? complete : item)));
    } else {
      onUpdateExperiences([...experiences, complete]);
    }
    setIsExpModalOpen(false);
  };

  // --- Education Handlers ---
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
    triggerConfirm(
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month] = dateStr.split("-");
    const months = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    if (month && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
      return `${months[parseInt(month, 10) - 1]} ${year}`;
    }
    return year;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2 print:grid-cols-1 print:gap-6">
      {/* EXPERIENCE COLUMN */}
      <section id="pesquisa" className="scroll-mt-32 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 shadow-xs print-border print-shadow-none print-m-0 transition-colors duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-2.5 text-indigo-600 dark:text-indigo-400 print-border">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                {language === "en" ? "Professional Experience" : "Experiência Profissional"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                {language === "en" ? "My professional path and leadership roles." : "Minha trajetória profissional e funções de liderança."}
              </p>
            </div>
          </div>

          {isEditMode && (
            <button
              onClick={handleOpenExpAdd}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 no-print print:hidden"
              id="add-experience-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              {language === "en" ? "Add" : "Adicionar"}
            </button>
          )}
        </div>

        {experiences.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center font-sans">
            <Briefcase className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">Nenhuma experiência adicionada.</p>
          </div>
        ) : (
          <div className="relative border-l border-slate-100 dark:border-slate-800 ml-4 space-y-6">
            {experiences.map((exp) => (
              <div key={exp.id} className="relative pl-6 group print-break-inside-avoid">
                {/* Timeline dot */}
                {exp.current ? (
                  <span className="absolute -left-[6px] top-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 outline outline-1 outline-indigo-600 ring-2 ring-white dark:ring-slate-900">
                    <span className="absolute -inset-[3px] rounded-full bg-indigo-600/30 animate-ping"></span>
                    <span className="absolute inset-0 rounded-full bg-indigo-600 animate-pulse"></span>
                  </span>
                ) : (
                  <span className="absolute -left-[6px] top-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 outline outline-1 outline-indigo-600 ring-2 ring-white dark:ring-slate-900"></span>
                )}

                <div className="flex flex-col gap-1">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                        {language === "en" && exp.roleEn ? exp.roleEn : exp.role}
                      </h3>
                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 font-sans">
                        {exp.company}
                      </p>
                    </div>

                    {/* Actions and Dates */}
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-mono text-[11px] leading-none shrink-0 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md print:bg-transparent print:p-0">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 print:hidden" />
                        <span>
                          {formatDate(exp.startDate)} — {exp.current ? (language === "en" ? "Present" : "Atualmente") : formatDate(exp.endDate)}
                        </span>
                      </div>

                      {/* Admin Tools */}
                      {isEditMode && (
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity no-print print:hidden">
                          <button
                            onClick={() => handleOpenExpEdit(exp)}
                            className="rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            title="Editar Experiência"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExp(exp.id)}
                            className="rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Excluir Experiência"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {(exp.location || exp.locationEn) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-sans mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{language === "en" ? (exp.locationEn || exp.location) : (exp.location || exp.locationEn)}</span>
                    </div>
                  )}

                  <div className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-sans">
                    <MarkdownRenderer content={language === "en" && exp.descriptionEn ? exp.descriptionEn : exp.description} className="text-xs text-slate-500 dark:text-slate-400 font-sans space-y-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* EDUCATION COLUMN */}
      <section id="formacao" className="scroll-mt-32 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 shadow-xs print-border print-shadow-none print-m-0 transition-colors duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-2.5 text-indigo-600 dark:text-indigo-400 print-border">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                {language === "en" ? "Academic Background" : "Formação Acadêmica"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                {language === "en" ? "My degrees, postgraduate courses, and higher education." : "Minhas graduações, pós-graduações e ensino superior."}
              </p>
            </div>
          </div>

          {isEditMode && (
            <button
              onClick={handleOpenEduAdd}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 no-print print:hidden"
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
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">Nenhuma formação adicionada.</p>
          </div>
        ) : (
          <div className="relative border-l border-slate-100 dark:border-slate-800 ml-4 space-y-6">
            {educations.map((edu) => (
              <div key={edu.id} className="relative pl-6 group print-break-inside-avoid">
                {/* Timeline dot */}
                {edu.current ? (
                  <span className="absolute -left-[6px] top-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 outline outline-1 outline-indigo-600 ring-2 ring-white dark:ring-slate-900">
                    <span className="absolute -inset-[3px] rounded-full bg-indigo-600/30 animate-ping"></span>
                    <span className="absolute inset-0 rounded-full bg-indigo-600 animate-pulse"></span>
                  </span>
                ) : (
                  <span className="absolute -left-[6px] top-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 outline outline-1 outline-indigo-600 ring-2 ring-white dark:ring-slate-900"></span>
                )}

                <div className="flex flex-col gap-1">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                        {language === "en" ? `${edu.degreeEn || edu.degree} in ${edu.fieldOfStudyEn || edu.fieldOfStudy}` : `${edu.degree} em ${edu.fieldOfStudy}`}
                      </h3>
                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 font-sans">
                        {edu.institution}
                      </p>
                    </div>

                    {/* Actions and Dates */}
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-mono text-[11px] leading-none shrink-0 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md print:bg-transparent print:p-0">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 print:hidden" />
                        <span>
                          {formatDate(edu.startDate)} — {edu.current ? (language === "en" ? "Present" : "Atualmente") : formatDate(edu.endDate)}
                        </span>
                      </div>

                      {/* Admin Tools */}
                      {isEditMode && (
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity no-print print:hidden">
                          <button
                            onClick={() => handleOpenEduEdit(edu)}
                            className="rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Editar Formação"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEdu(edu.id)}
                            className="rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Excluir Formação"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {(edu.description || edu.descriptionEn) && (
                    <div className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-sans">
                      <MarkdownRenderer content={language === "en" ? (edu.descriptionEn || edu.description) : (edu.description || edu.descriptionEn)} className="text-xs text-slate-500 dark:text-slate-400 font-sans space-y-1" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Experience Form Modal */}
      <EditModal
        isOpen={isExpModalOpen}
        onClose={() => setIsExpModalOpen(false)}
        title={editingExp ? (language === "en" ? "Edit Professional Experience" : "Editar Experiência Profissional") : (language === "en" ? "Add Experience" : "Adicionar Experiência")}
        size="xl"
      >
        <form onSubmit={handleExpSubmit} className="space-y-4">
          
          {/* Editing Language Toggle */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700 font-sans">
                {language === "en" ? "Language under Editing" : "Idioma em Edição"}
              </p>
              <p className="text-[10px] text-slate-400 font-sans">
                {language === "en" 
                  ? "Toggle to specify contents in Portuguese or English" 
                  : "Alterne para preencher as informações em Português ou Inglês"}
              </p>
            </div>
            <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 self-start sm:self-auto shrink-0 font-sans">
              <button
                type="button"
                onClick={() => setEditingLanguage("pt")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  editingLanguage === "pt"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => setEditingLanguage("en")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  editingLanguage === "en"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Company Name *" : "Nome da Empresa *"}
              </label>
              <input
                type="text"
                required
                value={expForm.company || ""}
                onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            {editingLanguage === "pt" ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Cargo / Função * (Português)
                </label>
                <input
                  type="text"
                  required
                  value={expForm.role || ""}
                  onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Job Role / Title * (English)
                </label>
                <input
                  type="text"
                  required
                  value={expForm.roleEn || ""}
                  onChange={(e) => setExpForm({ ...expForm, roleEn: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {editingLanguage === "pt" ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Localização (Português)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Remoto, São Paulo"
                  value={expForm.location || ""}
                  onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Location (English)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Remote, São Paulo"
                  value={expForm.locationEn || ""}
                  onChange={(e) => setExpForm({ ...expForm, locationEn: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Start Month/Year *" : "Mês/Ano de Início *"}
              </label>
              <input
                type="month"
                required
                value={expForm.startDate || ""}
                onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "End Month/Year" : "Mês/Ano de Término"}
              </label>
              <input
                type="month"
                required={!expForm.current}
                disabled={expForm.current}
                value={expForm.current ? "" : expForm.endDate || ""}
                onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="exp-current"
              checked={expForm.current || false}
              onChange={(e) => setExpForm({ ...expForm, current: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="exp-current" className="text-xs font-semibold text-slate-600 font-mono uppercase tracking-wider cursor-pointer select-none">
              {language === "en" ? "I currently work in this role" : "Trabalho atualmente nesta função"}
            </label>
          </div>

          {editingLanguage === "pt" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Descrição das Atividades e Conquistas (Português) *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Descreva suas responsabilidades, principais tecnologias e resultados alcançados..."
                value={expForm.description || ""}
                onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden resize-y"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Description of Activities & Achievements (English) *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Describe your responsibilities, main technologies, and results achieved in English..."
                value={expForm.descriptionEn || ""}
                onChange={(e) => setExpForm({ ...expForm, descriptionEn: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden resize-y"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExpModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {language === "en" ? "Cancel" : "Cancelar"}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
            >
              {language === "en" ? "Save Experience" : "Salvar Experiência"}
            </button>
          </div>
        </form>
      </EditModal>

      {/* Education Form Modal */}
      <EditModal
        isOpen={isEduModalOpen}
        onClose={() => setIsEduModalOpen(false)}
        title={editingEdu ? (language === "en" ? "Edit Education or Course" : "Editar Formação ou Curso") : (language === "en" ? "Add Education or Course" : "Adicionar Formação ou Curso")}
        size="xl"
      >
        <form onSubmit={handleEduSubmit} className="space-y-4">
          
          {/* Editing Language Toggle */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700 font-sans">
                {language === "en" ? "Language under Editing" : "Idioma em Edição"}
              </p>
              <p className="text-[10px] text-slate-400 font-sans">
                {language === "en" 
                  ? "Toggle to specify contents in Portuguese or English" 
                  : "Alterne para preencher as informações em Português ou Inglês"}
              </p>
            </div>
            <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 self-start sm:self-auto shrink-0 font-sans">
              <button
                type="button"
                onClick={() => setEditingLanguage("pt")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  editingLanguage === "pt"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => setEditingLanguage("en")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  editingLanguage === "en"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Institution Name *" : "Nome da Instituição *"}
              </label>
              <input
                type="text"
                required
                value={eduForm.institution || ""}
                onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            {editingLanguage === "pt" ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Curso / Campo de Estudo * (Português)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Engenharia de Software, Física"
                  value={eduForm.fieldOfStudy || ""}
                  onChange={(e) => setEduForm({ ...eduForm, fieldOfStudy: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Course / Field of Study * (English)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Software Engineering, Physics"
                  value={eduForm.fieldOfStudyEn || ""}
                  onChange={(e) => setEduForm({ ...eduForm, fieldOfStudyEn: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {editingLanguage === "pt" ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Grau Acadêmico / Tipo * (Português)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bacharelado, Mestrado, Certificação"
                  value={eduForm.degree || ""}
                  onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Academic Degree / Type * (English)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bachelor's, Master's, Certification"
                  value={eduForm.degreeEn || ""}
                  onChange={(e) => setEduForm({ ...eduForm, degreeEn: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Start Month/Year *" : "Mês/Ano de Início *"}
              </label>
              <input
                type="month"
                required
                value={eduForm.startDate || ""}
                onChange={(e) => setEduForm({ ...eduForm, startDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "End Month/Year" : "Mês/Ano de Conclusão"}
              </label>
              <input
                type="month"
                required={!eduForm.current}
                disabled={eduForm.current}
                value={eduForm.current ? "" : eduForm.endDate || ""}
                onChange={(e) => setEduForm({ ...eduForm, endDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edu-current"
              checked={eduForm.current || false}
              onChange={(e) => setEduForm({ ...eduForm, current: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="edu-current" className="text-xs font-semibold text-slate-600 font-mono uppercase tracking-wider cursor-pointer select-none">
              {language === "en" ? "I am currently studying this" : "Estou cursando atualmente"}
            </label>
          </div>

          {editingLanguage === "pt" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Detalhes / Descrição Curta (Opcional) (Português)
              </label>
              <textarea
                rows={5}
                placeholder="Principais focos, prêmios ou disciplinas relevantes..."
                value={eduForm.description || ""}
                onChange={(e) => setEduForm({ ...eduForm, description: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden resize-y"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Details / Short Description (Optional) (English)
              </label>
              <textarea
                rows={5}
                placeholder="Main focus, awards or relevant subjects in English..."
                value={eduForm.descriptionEn || ""}
                onChange={(e) => setEduForm({ ...eduForm, descriptionEn: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden resize-y"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEduModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {language === "en" ? "Cancel" : "Cancelar"}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
            >
              {language === "en" ? "Save Education" : "Salvar Formação"}
            </button>
          </div>
        </form>
      </EditModal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmCallback || (() => {})}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={language === "en" ? "Delete" : "Excluir"}
        cancelText={language === "en" ? "Cancel" : "Cancelar"}
        type="danger"
      />
    </div>
  );
}
