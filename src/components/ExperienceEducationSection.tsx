import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Experience, AcademicActivity, Education, Subperiod, Project } from "../types";
import {
  FlaskConical,
  Users,
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import MarkdownRenderer from "./MarkdownRenderer";
import { ReorderableList } from "./Reorderable";
import { localePath } from "../lib/routes";
import { Language } from "../lib/translations";
import TranslateButton from "./TranslateButton";
import { autoTranslateFields } from "../lib/translator";

interface ExperienceEducationSectionProps {
  experiences: Experience[];
  academicActivities?: AcademicActivity[];
  educations: Education[];
  projects?: Project[];
  isEditMode: boolean;
  onUpdateExperiences: (updated: Experience[]) => void;
  onUpdateAcademicActivities?: (updated: AcademicActivity[]) => void;
  onUpdateEducations: (updated: Education[]) => void;
  language?: Language;
}

export default function ExperienceEducationSection({
  experiences,
  academicActivities = [],
  educations,
  projects = [],
  isEditMode,
  onUpdateExperiences,
  onUpdateAcademicActivities,
  onUpdateEducations,
  language = "pt",
}: ExperienceEducationSectionProps) {
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");

  // Confirm Modal States
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");

  // Helper to render project cross reference chips (ETAPA 9.4)
  const renderProjectChips = (projectCodes?: string[]) => {
    if (!projectCodes || projectCodes.length === 0) return null;

    return (
      <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5 no-print print:hidden">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-sans">
            {language === "en" ? "Related Projects:" : "Projetos relacionados:"}
          </span>
          {projectCodes.map((code, idx) => {
            const proj = projects.find((p) => p.codigo === code || p.id === code);

            if (!proj) {
              if (isEditMode) {
                return (
                  <span
                    key={`exp-code-err-${code}-${idx}`}
                    className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[11px] font-mono font-semibold"
                    title="Código de projeto não encontrado"
                  >
                    <AlertCircle className="h-3 w-3 text-rose-500" />
                    <span>Código inexistente: [{code}]</span>
                  </span>
                );
              }
              return (
                <span
                  key={`exp-code-${code}-${idx}`}
                  className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 text-[11px] font-sans"
                >
                  {code}
                </span>
              );
            }

            return (
              <Link
                key={`exp-code-proj-${code}-${idx}`}
                to={localePath(`/projetos/${proj.codigo || proj.id}`, language)}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-0.5 text-[11.5px] font-sans font-medium transition-colors"
              >
                <span>{language === "en" && proj.titleEn ? proj.titleEn : proj.title}</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-70" />
              </Link>
            );
          })}
        </div>
        
        {/* Printable view without links */}
        <div className="hidden print:block text-xs text-slate-600 dark:text-slate-400 mt-1">
          Projetos: {projectCodes.map((code) => projects.find((p) => p.codigo === code || p.id === code)?.title || code).join(", ")}
        </div>
      </div>
    );
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setConfirmOpen(true);
  };

  // --- Research Experience Modal States ---
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [expError, setExpError] = useState<string | null>(null);
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
    skills: [],
    subperiods: [],
  });
  const [skillInput, setSkillInput] = useState("");

  // Subperiod input in modal
  const [newSubTitle, setNewSubTitle] = useState("");
  const [newSubStart, setNewSubStart] = useState("");
  const [newSubEnd, setNewSubEnd] = useState("");
  const [newSubCurrent, setNewSubCurrent] = useState(false);
  const [newSubDesc, setNewSubDesc] = useState("");

  // --- Academic Activity Modal States ---
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

  // --- Education Modal States ---
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

  // --- Research Experience Handlers ---
  const handleOpenExpAdd = () => {
    setEditingExp(null);
    setExpError(null);
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
      skills: [],
      subperiods: [],
      projetos: [],
    });
    setSkillInput("");
    setEditingLanguage(language);
    setIsExpModalOpen(true);
  };

  const handleOpenExpEdit = (exp: Experience) => {
    setEditingExp(exp);
    setExpError(null);
    setExpForm({ ...exp, subperiods: exp.subperiods ? [...exp.subperiods] : [], projetos: exp.projetos || [] });
    setSkillInput(exp.skills ? exp.skills.join(", ") : "");
    setEditingLanguage(language);
    setIsExpModalOpen(true);
  };

  const handleDeleteExp = (id: string) => {
    triggerConfirm(
      language === "en" ? "Delete Experience" : "Excluir Experiência",
      language === "en"
        ? "Are you sure you want to delete this research experience?"
        : "Deseja realmente excluir esta experiência em pesquisa?",
      () => {
        onUpdateExperiences(experiences.filter((e) => e.id !== id));
      }
    );
  };

  const handleAddSubperiod = () => {
    if (!newSubStart && !newSubTitle) return;
    const newSub: Subperiod = {
      id: `sub-${Date.now()}`,
      startDate: newSubStart,
      endDate: newSubCurrent ? "" : newSubEnd,
      current: newSubCurrent,
      title: newSubTitle,
      description: newSubDesc,
    };
    setExpForm((prev) => ({
      ...prev,
      subperiods: [...(prev.subperiods || []), newSub],
    }));
    setNewSubTitle("");
    setNewSubStart("");
    setNewSubEnd("");
    setNewSubCurrent(false);
    setNewSubDesc("");
  };

  const handleRemoveSubperiod = (subId: string) => {
    setExpForm((prev) => ({
      ...prev,
      subperiods: (prev.subperiods || []).filter((s) => s.id !== subId),
    }));
  };

  const handleAutoTranslateExp = async () => {
    await autoTranslateFields(
      {
        roleEn: expForm.role || "",
        locationEn: expForm.location || "",
        descriptionEn: expForm.description || "",
      },
      setExpForm
    );
    setEditingLanguage("en");
  };

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

  const handleExpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const desc = expForm.description || "";

    // Constraint: Block save if description < 40 characters
    if (desc.trim().length < 40) {
      setExpError(
        language === "en"
          ? "The description must be at least 40 characters long."
          : "A descrição deve ter no mínimo 40 caracteres."
      );
      return;
    }

    setExpError(null);

    const parsedSkills = skillInput
      ? skillInput.split(",").map((s) => s.trim()).filter(Boolean)
      : expForm.skills || [];

    const complete: Experience = {
      id: editingExp?.id || `exp-${Date.now()}`,
      company: expForm.company || "CNPq · Instituição",
      role: expForm.role || "Iniciação Científica",
      roleEn: expForm.roleEn || "",
      location: expForm.location || undefined,
      locationEn: expForm.locationEn || undefined,
      startDate: expForm.startDate || "",
      endDate: expForm.current ? "" : expForm.endDate || "",
      current: expForm.current || false,
      description: desc,
      descriptionEn: expForm.descriptionEn || "",
      type: "research",
      skills: parsedSkills,
      subperiods: expForm.subperiods || [],
      links: expForm.links || [],
      projetos: expForm.projetos || [],
    };

    if (editingExp) {
      onUpdateExperiences(experiences.map((item) => (item.id === editingExp.id ? complete : item)));
    } else {
      onUpdateExperiences([...experiences, complete]);
    }
    setIsExpModalOpen(false);
  };

  // --- Academic Activity Handlers ---
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
    triggerConfirm(
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    if (dateStr.length === 4) return dateStr; // e.g. "2024"
    const [year, month] = dateStr.split("-");
    const monthsPt = [
      "jan", "fev", "mar", "abr", "mai", "jun",
      "jul", "ago", "set", "out", "nov", "dez"
    ];
    const monthsEn = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const months = language === "en" ? monthsEn : monthsPt;
    if (month && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
      return `${months[parseInt(month, 10) - 1]} ${year}`;
    }
    return dateStr;
  };

  const formatPeriodDisplay = (start?: string, end?: string, isCurrent?: boolean) => {
    const s = formatDate(start);
    const e = isCurrent
      ? language === "en" ? "Present" : "Presente"
      : formatDate(end);
    if (!s && !e) return "";
    if (!s) return e;
    if (!e) return s;
    return `${s} — ${e}`;
  };

  return (
    <div className="space-y-10 print:space-y-8">
      {/* SEÇÃO 1: FORMAÇÃO ACADÊMICA (Education Section) */}
      <section
        id="formacao"
        className="scroll-mt-32 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 md:p-10 shadow-xs transition-colors duration-300"
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
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
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
                          {formatPeriodDisplay(edu.startDate, edu.endDate, edu.current)}
                        </div>

                        {isEditMode && (
                          <div className="flex items-center gap-1 no-print print:hidden">
                            <button
                              onClick={() => handleOpenEduEdit(edu)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                              title="Editar Formação"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEdu(edu.id)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Excluir Formação"
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

      {/* SEÇÃO 2: EXPERIÊNCIA EM PESQUISA (Research Experience) */}
      <section
        id="pesquisa"
        className="scroll-mt-32 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 md:p-10 shadow-xs transition-colors duration-300"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/50 p-2.5 text-indigo-600 dark:text-indigo-400 print-border">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                {language === "en" ? "Research Experience" : "Experiência em pesquisa"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
                {language === "en" ? "Formal research affiliations" : "Vínculos formais de pesquisa"}
              </p>
            </div>
          </div>

          {isEditMode && (
            <button
              onClick={handleOpenExpAdd}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 no-print print:hidden cursor-pointer"
              id="add-research-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              {language === "en" ? "Add" : "Adicionar"}
            </button>
          )}
        </div>

        {experiences.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center font-sans">
            <FlaskConical className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
              Nenhuma experiência em pesquisa cadastrada.
            </p>
          </div>
        ) : (
          <ReorderableList
            items={experiences}
            isEditMode={isEditMode}
            onReorder={onUpdateExperiences}
            getKey={(exp) => exp.id}
            className="space-y-6"
            itemClassName="group relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 p-5 sm:p-6 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700"
          >
            {(exp, dragHandle) => {
              const roleText = language === "en" && exp.roleEn ? exp.roleEn : exp.role;
              const locationText = language === "en" && exp.locationEn ? exp.locationEn : exp.location;
              const descText = language === "en" && exp.descriptionEn ? exp.descriptionEn : exp.description;
              const hasDescription = descText && descText.trim().length > 0;

              return (
                <div id={`research-${exp.id}`} className="flex items-start gap-2">
                  {dragHandle && (
                    <div className="mt-1 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity">
                      {dragHandle}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {/* Top Row: Role, Company, Location & Period */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1">
                        {/* Cargo (15px, weight 500) */}
                        <h3 className="text-[15px] font-medium text-slate-900 dark:text-white font-sans leading-snug">
                          {roleText}
                        </h3>

                        {/* Instituição e sigla na cor de acento */}
                        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 font-sans">
                          {exp.company}
                        </p>

                        {/* Local e tipo de vínculo em cor apagada */}
                        {locationText && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                            {locationText}
                          </p>
                        )}
                      </div>

                      {/* Right column: Period Pill & Admin controls */}
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                          {formatPeriodDisplay(exp.startDate, exp.endDate, exp.current)}
                        </div>

                        {isEditMode && (
                          <div className="flex items-center gap-1 no-print print:hidden">
                            <button
                              onClick={() => handleOpenExpEdit(exp)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                              title="Editar Pesquisa"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExp(exp.id)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Excluir Pesquisa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Descrição Corrida */}
                    <div className="mt-3.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-sans">
                      {hasDescription ? (
                        <MarkdownRenderer content={descText} className="text-sm text-slate-700 dark:text-slate-300 font-sans space-y-1" />
                      ) : isEditMode ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                          descrição pendente
                        </p>
                      ) : null}
                    </div>

                    {/* Subperíodos (quando houver) */}
                    {exp.subperiods && exp.subperiods.length > 0 && (
                      <div className="mt-4 border-l-2 border-slate-300 dark:border-slate-700 pl-[14px] space-y-3.5 my-3.5">
                        {exp.subperiods.map((sub) => {
                          const subTitleText = language === "en" && sub.titleEn ? sub.titleEn : sub.title;
                          const subDescText = language === "en" && sub.descriptionEn ? sub.descriptionEn : sub.description;
                          const subHasText = (subTitleText && subTitleText.trim()) || (subDescText && subDescText.trim());

                          return (
                            <div key={sub.id} className="space-y-0.5">
                              {/* Período em monoespaçada 11px */}
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 block">
                                {formatPeriodDisplay(sub.startDate, sub.endDate, sub.current)}
                              </span>

                              {/* Linha de descrição do subperíodo */}
                              {subHasText ? (
                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 font-sans">
                                  {subTitleText || subDescText}
                                </p>
                              ) : isEditMode ? (
                                <p className="text-xs text-slate-400 dark:text-slate-500 italic font-sans">
                                  {subTitleText ? `${subTitleText} — ` : ""}descrição pendente
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Links de Produção (se houver) */}
                    {exp.links && exp.links.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap gap-3">
                        {exp.links.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-sans font-medium"
                          >
                            <span>{link.title}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Competências como chips (chips separados por linha divisória de 0.5px) */}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="mt-4 border-t border-slate-200/80 dark:border-slate-800 pt-3.5 flex flex-wrap gap-2">
                        {exp.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60 rounded-full px-3 py-1 text-xs font-mono font-medium select-none"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Projetos Relacionados (ETAPA 9.4) */}
                    {renderProjectChips(exp.projetos)}
                  </div>
                </div>
              );
            }}
          </ReorderableList>
        )}
      </section>

      {/* SEÇÃO 2: ATIVIDADES ACADÊMICAS (Academic Activities Grid) */}
      {(academicActivities.length > 0 || isEditMode) && (
        <section
          id="atividades-academicas"
          className="scroll-mt-32 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 md:p-10 shadow-xs transition-colors duration-300"
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
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
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
                            {formatPeriodDisplay(act.startDate, act.endDate, act.current)}
                          </div>

                          {isEditMode && (
                            <div className="flex items-center gap-1 no-print print:hidden">
                              <button
                                onClick={() => handleOpenActEdit(act)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                title="Editar Atividade"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAct(act.id)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                title="Excluir Atividade"
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
                      {renderProjectChips(act.projetos)}
                    </div>
                  </div>
                );
              }}
            </ReorderableList>
          )}
        </section>
      )}

      {/* --- RESEARCH EXPERIENCE MODAL --- */}
      <EditModal
        isOpen={isExpModalOpen}
        onClose={() => setIsExpModalOpen(false)}
        title={
          editingExp
            ? language === "en" ? "Edit Research Experience" : "Editar Experiência em Pesquisa"
            : language === "en" ? "Add Research Experience" : "Adicionar Experiência em Pesquisa"
        }
      >
        <form onSubmit={handleExpSubmit} className="space-y-4 text-xs font-sans">
          {expError && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 p-3 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{expError}</span>
            </div>
          )}

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
              onTranslate={handleAutoTranslateExp}
              label={language === "en" ? "Auto-Translate PT → EN" : "Traduzir PT → EN (Gemini AI)"}
              size="sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cargo / Função {editingLanguage === "en" && "(English)"} *
            </label>
            <input
              type="text"
              required
              value={editingLanguage === "en" ? expForm.roleEn || "" : expForm.role || ""}
              onChange={(e) =>
                setExpForm((prev) =>
                  editingLanguage === "en"
                    ? { ...prev, roleEn: e.target.value }
                    : { ...prev, role: e.target.value }
                )
              }
              placeholder="e.g. Iniciação científica — pesquisador bolsista"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Instituição / Órgão de Fomento *
            </label>
            <input
              type="text"
              required
              value={expForm.company || ""}
              onChange={(e) => setExpForm((prev) => ({ ...prev, company: e.target.value }))}
              placeholder="e.g. CNPq · Universidade Federal de Lavras"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Local e Tipo de Vínculo
            </label>
            <input
              type="text"
              value={editingLanguage === "en" ? expForm.locationEn || "" : expForm.location || ""}
              onChange={(e) =>
                setExpForm((prev) =>
                  editingLanguage === "en"
                    ? { ...prev, locationEn: e.target.value }
                    : { ...prev, location: e.target.value }
                )
              }
              placeholder="e.g. Lavras, MG · bolsista"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data Inicial (AAAA-MM ou AAAA)
              </label>
              <input
                type="text"
                value={expForm.startDate || ""}
                onChange={(e) => setExpForm((prev) => ({ ...prev, startDate: e.target.value }))}
                placeholder="2023-08"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data Final
              </label>
              <input
                type="text"
                disabled={expForm.current}
                value={expForm.current ? "" : expForm.endDate || ""}
                onChange={(e) => setExpForm((prev) => ({ ...prev, endDate: e.target.value }))}
                placeholder="2025-09"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="exp-current"
              checked={expForm.current || false}
              onChange={(e) => setExpForm((prev) => ({ ...prev, current: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="exp-current" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              {language === "en" ? "Currently active" : "Vínculo atual"}
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descrição Corrida (Mínimo 40 caracteres) *
            </label>
            <textarea
              rows={4}
              value={editingLanguage === "en" ? expForm.descriptionEn || "" : expForm.description || ""}
              onChange={(e) => {
                const val = e.target.value;
                setExpForm((prev) =>
                  editingLanguage === "en"
                    ? { ...prev, descriptionEn: val }
                    : { ...prev, description: val }
                );
                if (val.trim().length >= 40) setExpError(null);
              }}
              placeholder="Alinhamento de cavidades de lasers de femtossegundos e caracterização de meios ativos..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
            />
            <span className="text-[10px] text-slate-400">
              {(editingLanguage === "en" ? expForm.descriptionEn : expForm.description)?.length || 0}/40 caracteres
            </span>
          </div>

          {/* Subperíodos */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Subperíodos (Renovação de bolsa / projetos aninhados)
            </label>

            {expForm.subperiods && expForm.subperiods.length > 0 && (
              <div className="space-y-2 mb-3">
                {expForm.subperiods.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs">
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                        {formatPeriodDisplay(sub.startDate, sub.endDate, sub.current)}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {sub.title || sub.description || "Subperíodo"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubperiod(sub.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg space-y-2">
              <input
                type="text"
                placeholder="Título do subperíodo (e.g. Caracterização de meios ativos)"
                value={newSubTitle}
                onChange={(e) => setNewSubTitle(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Início (AAAA-MM)"
                  value={newSubStart}
                  onChange={(e) => setNewSubStart(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  disabled={newSubCurrent}
                  placeholder="Fim (AAAA-MM)"
                  value={newSubEnd}
                  onChange={(e) => setNewSubEnd(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSubCurrent}
                    onChange={(e) => setNewSubCurrent(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Atual</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddSubperiod}
                  className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300 cursor-pointer"
                >
                  + Adicionar subperíodo
                </button>
              </div>
            </div>
          </div>

          {/* Competências / Chips */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Competências / Chips (separadas por vírgula)
            </label>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="Python, PyVISA, Óptica ultrarrápida, Automação"
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
                  const isSelected = (expForm.projetos || []).includes(pIdentifier);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const currentProjs = expForm.projetos || [];
                        const updatedProjs = isSelected
                          ? currentProjs.filter((id) => id !== pIdentifier)
                          : [...currentProjs, pIdentifier];
                        setExpForm((prev) => ({ ...prev, projetos: updatedProjs }));
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
              value={(expForm.projetos || []).join(", ")}
              onChange={(e) => {
                const val = e.target.value;
                const parsed = val.split(",").map((s) => s.trim()).filter(Boolean);
                setExpForm((prev) => ({ ...prev, projetos: parsed }));
              }}
              placeholder="Códigos de projetos separados por vírgula (ex: yolocraft, laser-sim)"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white font-mono text-[11px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsExpModalOpen(false)}
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
            <span className="text-[10px] text-slate-400 mt-1 block">
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

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (confirmCallback) confirmCallback();
          setConfirmOpen(false);
        }}
        title={confirmTitle}
        message={confirmMessage}
      />
    </div>
  );
}
