import React, { useState } from "react";
import { Skill, SkillCategory } from "../types";
import { Award, Plus, FolderPlus, Edit2, Trash2, Star, Tag } from "lucide-react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import { ReorderableList } from "./Reorderable";
import { Language } from "../lib/translations";
import TranslateButton from "./TranslateButton";
import { autoTranslateFields } from "../lib/translator";
import { SECTION_CARD_CLASS } from "../lib/cardStyle";

interface SkillsSectionProps {
  skills: Skill[];
  skillCategories: SkillCategory[];
  isEditMode: boolean;
  onUpdateSkills: (updatedSkills: Skill[]) => void;
  onUpdateSkillCategories: (updatedCategories: SkillCategory[]) => void;
  language?: Language;
}

// Accent palette cycled per category so groups are visually easy to tell apart.
const CATEGORY_ACCENTS = [
  { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400", bar: "bg-indigo-600 dark:bg-indigo-500" },
  { bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-600 dark:text-sky-400", bar: "bg-sky-600 dark:bg-sky-500" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-600 dark:bg-emerald-500" },
  { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500 dark:bg-amber-500" },
  { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400", bar: "bg-violet-600 dark:bg-violet-500" },
  { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-600 dark:bg-rose-500" },
  { bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400", bar: "bg-teal-600 dark:bg-teal-500" },
  { bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40", text: "text-fuchsia-600 dark:text-fuchsia-400", bar: "bg-fuchsia-600 dark:bg-fuchsia-500" },
];

const getCategoryAccent = (index: number) => CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length];

const LEVEL_LABELS: Record<number, { pt: string; en: string }> = {
  1: { pt: "Iniciante", en: "Beginner" },
  2: { pt: "Básico / Intermediário", en: "Basic / Intermediate" },
  3: { pt: "Confortável / Bom", en: "Comfortable / Good" },
  4: { pt: "Avançado / Ótimo", en: "Advanced / Great" },
  5: { pt: "Especialista / Excelente", en: "Expert / Excellent" },
};

const inputClasses =
  "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden font-sans";

interface SkillRowProps {
  skill: Skill;
  language: Language;
  accent: { bg: string; text: string; bar: string };
  isEditMode: boolean;
  onEdit: (skill: Skill) => void;
  onDelete: (id: string) => void;
  onSetLevel: (id: string, level: number) => void;
  dragHandle?: React.ReactNode;
}

function SkillRowContent({ skill, language, accent, isEditMode, onEdit, onDelete, onSetLevel, dragHandle }: SkillRowProps) {
  // Hovering a star previews that level (stars + bar) before it's committed.
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const shownLevel = previewLevel ?? skill.level;

  return (
    <div className="flex items-start gap-2">
      {isEditMode && dragHandle && (
        <div className="mt-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity">
          {dragHandle}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans">
            {language === "en" && skill.nameEn ? skill.nameEn : skill.name}
          </span>

          {/* Level number or star count for print stability */}
          <div className="flex items-center gap-1">
            {/* Stars — clickable in edit mode so the level can be set without opening the modal */}
            <div
              className="flex gap-0.5 print:hidden"
              onMouseLeave={() => setPreviewLevel(null)}
            >
              {[1, 2, 3, 4, 5].map((level) => {
                const starClass = `${isEditMode ? "h-4 w-4" : "h-3 w-3"} transition-colors ${
                  level <= shownLevel
                    ? "text-amber-400 fill-amber-400"
                    : "text-slate-200 dark:text-slate-700"
                }`;

                if (!isEditMode) return <Star key={level} className={starClass} />;

                const label = LEVEL_LABELS[level];
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onSetLevel(skill.id, level)}
                    onMouseEnter={() => setPreviewLevel(level)}
                    onFocus={() => setPreviewLevel(level)}
                    onBlur={() => setPreviewLevel(null)}
                    className="-m-0.5 cursor-pointer rounded p-0.5 transition-transform hover:scale-125 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-400"
                    title={`${level}/5 — ${language === "en" ? label.en : label.pt}`}
                    aria-label={`${language === "en" ? "Set level" : "Definir nível"} ${level}/5`}
                  >
                    <Star className={starClass} />
                  </button>
                );
              })}
            </div>
            {/* Simple numeric readout for print and accessibility */}
            <span className="hidden print:inline text-[10px] font-mono text-slate-500 font-semibold">
              {language === "en" ? "Level" : "Nível"} {skill.level}/5
            </span>
          </div>
        </div>

        {/* Visual progress bar tinted per category */}
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden print:hidden">
          <div
            className={`h-full rounded-full ${accent.bar}`}
            style={{ width: `${(shownLevel / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Admin Tools — inline (not overlaying) so the stars stay clickable */}
      {isEditMode && (
        <div className="mt-0.5 flex shrink-0 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 items-center gap-0.5 no-print print:hidden transition-opacity duration-200">
          <button
            onClick={() => onEdit(skill)}
            className="p-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Editar Habilidade"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(skill.id)}
            className="p-0.5 rounded text-rose-600 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Excluir Habilidade"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

interface MergedCategory {
  id: string;
  name: string;
  nameEn?: string;
  /** Not in skillCategories — exists only because a skill still references it. */
  isOrphan: boolean;
}

export default function SkillsSection({
  skills,
  skillCategories,
  isEditMode,
  onUpdateSkills,
  onUpdateSkillCategories,
  language = "pt",
}: SkillsSectionProps) {
  const t = (pt: string, en: string) => (language === "en" ? en : pt);

  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmType, setConfirmType] = useState<"danger" | "warning" | "info">("danger");
  const [hoverLevel, setHoverLevel] = useState<number | null>(null);

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: "danger" | "warning" | "info" = "danger"
  ) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setConfirmType(type);
    setConfirmOpen(true);
  };

  // --- Skill Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [lockedCategory, setLockedCategory] = useState<{ name: string; nameEn?: string } | null>(null);
  const [skillForm, setSkillForm] = useState<Partial<Skill>>({
    name: "",
    nameEn: "",
    category: "",
    categoryEn: "",
    level: 4,
  });

  // --- Section (Category) Modal State ---
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState<{ name: string; nameEn: string }>({ name: "", nameEn: "" });

  const handleAutoTranslateSkill = async () => {
    const fields: Record<string, string> = { nameEn: skillForm.name || "" };
    if (!lockedCategory) fields.categoryEn = skillForm.category || "";
    await autoTranslateFields(fields, setSkillForm);
    setEditingLanguage("en");
  };

  const handleAutoTranslateSection = async () => {
    await autoTranslateFields({ nameEn: sectionForm.name || "" }, setSectionForm);
    setEditingLanguage("en");
  };

  // Sections (categories) are explicit entities now (`skillCategories`), so a
  // section can exist before it has any skills. Legacy/imported skills whose
  // category isn't in that list yet still show up as an "orphan" section, so
  // nothing already saved disappears.
  const mergedCategories: MergedCategory[] = [
    ...skillCategories.map((c) => ({ ...c, isOrphan: false })),
    ...Array.from(new Set(skills.map((s) => s.category)))
      .filter((name) => !skillCategories.some((c) => c.name === name))
      .map((name) => ({
        id: `orphan-${name}`,
        name,
        nameEn: skills.find((s) => s.category === name && s.categoryEn)?.categoryEn,
        isOrphan: true,
      })),
  ];

  const catDisplayName = (cat: MergedCategory, lang: Language) => (lang === "en" ? cat.nameEn || cat.name : cat.name);

  // Reordering only moves skills within the same category — other categories'
  // positions in the underlying flat array are left untouched.
  const handleReorderCategory = (catName: string, reorderedCatSkills: Skill[]) => {
    let i = 0;
    const merged = skills.map((s) => (s.category === catName ? reorderedCatSkills[i++] : s));
    onUpdateSkills(merged);
  };

  // --- Section Handlers ---
  const handleOpenSectionAdd = () => {
    setSectionForm({ name: "", nameEn: "" });
    setEditingLanguage(language);
    setIsSectionModalOpen(true);
  };

  const handleSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = (sectionForm.name || "").trim();
    if (!name) return;
    const newCategory: SkillCategory = {
      id: `skillcat-${Date.now()}`,
      name,
      nameEn: (sectionForm.nameEn || "").trim() || undefined,
    };
    onUpdateSkillCategories([...skillCategories, newCategory]);
    setIsSectionModalOpen(false);
  };

  const handleDeleteCategory = (cat: MergedCategory) => {
    const hasSkills = skills.some((s) => s.category === cat.name);
    if (hasSkills) {
      triggerConfirm(
        t("Seção não está vazia", "Section isn't empty"),
        t(
          "Mova ou exclua as habilidades desta seção antes de removê-la.",
          "Move or delete this section's skills before removing it."
        ),
        () => {},
        "info"
      );
      return;
    }
    triggerConfirm(
      t("Excluir Seção", "Delete Section"),
      t(
        `Deseja realmente excluir a seção "${cat.name}"?`,
        `Are you sure you want to delete the "${cat.name}" section?`
      ),
      () => {
        onUpdateSkillCategories(skillCategories.filter((c) => c.id !== cat.id));
      }
    );
  };

  // --- Skill Handlers ---
  const handleOpenAddToCategory = (cat: MergedCategory) => {
    setEditingSkill(null);
    setLockedCategory({ name: cat.name, nameEn: cat.nameEn });
    setSkillForm({ name: "", nameEn: "", category: cat.name, categoryEn: cat.nameEn || "", level: 4 });
    setEditingLanguage(language);
    setHoverLevel(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setLockedCategory(null);
    setSkillForm({ ...skill });
    setEditingLanguage(language);
    setHoverLevel(null);
    setIsModalOpen(true);
  };

  // Inline star click in the list — updates the level straight away, no modal.
  const handleSetLevel = (id: string, level: number) => {
    onUpdateSkills(skills.map((s) => (s.id === id ? { ...s, level } : s)));
  };

  const handleDelete = (id: string) => {
    triggerConfirm(
      t("Excluir Habilidade", "Delete Skill"),
      t("Deseja realmente excluir esta habilidade?", "Are you sure you want to delete this skill?"),
      () => {
        onUpdateSkills(skills.filter((s) => s.id !== id));
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const complete: Skill = {
      id: editingSkill?.id || `skill-${Date.now()}`,
      name: skillForm.name || "Nova Habilidade",
      nameEn: skillForm.nameEn || "",
      category: skillForm.category || mergedCategories[0]?.name || "Outros",
      categoryEn: skillForm.categoryEn || "",
      level: skillForm.level || 4,
    };

    if (editingSkill) {
      onUpdateSkills(skills.map((s) => (s.id === editingSkill.id ? complete : s)));
    } else {
      onUpdateSkills([...skills, complete]);
    }
    setIsModalOpen(false);
  };

  const activeLevel = hoverLevel ?? skillForm.level ?? 0;
  const levelLabel = LEVEL_LABELS[skillForm.level && skillForm.level >= 1 && skillForm.level <= 5 ? skillForm.level : 4];

  return (
    <section id="habilidades" className={`mb-8 ${SECTION_CARD_CLASS}`}>
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-2.5 text-indigo-600 dark:text-indigo-400 print-border">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              {t("Habilidades & Competências", "Skills & Competencies")}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
              {t(
                "Minhas qualificações técnicas, frameworks e ferramentas de trabalho.",
                "My technical qualifications, frameworks and work tools."
              )}
            </p>
          </div>
        </div>

        {isEditMode && (
          <button
            onClick={handleOpenSectionAdd}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 no-print print:hidden cursor-pointer"
            id="add-skill-section-btn"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            {t("Nova Seção", "New Section")}
          </button>
        )}
      </div>

      {mergedCategories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center font-sans">
          <Award className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500 font-medium">
            {isEditMode
              ? t("Nenhuma seção criada. Clique em \"Nova Seção\" para começar.", "No sections yet. Click \"New Section\" to start.")
              : t("Nenhuma competência adicionada.", "No competencies added.")}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-2 print:gap-4">
          {mergedCategories.map((cat, idx) => {
            const catSkills = skills.filter((s) => s.category === cat.name);
            const accent = getCategoryAccent(idx);
            return (
              <div
                key={cat.id}
                className="rounded-xl border border-slate-100/50 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 p-5 print-border print-bg-transparent print-break-inside-avoid"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${accent.bg} ${accent.text} print-border print-bg-none`}>
                    <Tag className="h-3 w-3" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-sans truncate">
                    {catDisplayName(cat, language)}
                  </h3>
                  <span className="ml-auto shrink-0 text-[10px] font-mono font-semibold text-slate-300 dark:text-slate-600">
                    {catSkills.length}
                  </span>
                  {isEditMode && (
                    <div className="flex items-center gap-0.5 shrink-0 no-print print:hidden">
                      <button
                        onClick={() => handleOpenAddToCategory(cat)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        title={t("Adicionar habilidade", "Add skill")}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      {!cat.isOrphan && (
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title={t("Excluir seção", "Delete section")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {catSkills.length === 0 ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-600 font-sans italic">
                    {t("Nenhuma habilidade ainda.", "No skills yet.")}
                  </p>
                ) : (
                  <ReorderableList
                    items={catSkills}
                    isEditMode={isEditMode}
                    onReorder={(newOrder) => handleReorderCategory(cat.name, newOrder)}
                    getKey={(skill) => skill.id}
                    className="space-y-4"
                    itemClassName="group relative"
                  >
                    {(skill, dragHandle) => (
                      <SkillRowContent
                        skill={skill}
                        language={language}
                        accent={accent}
                        isEditMode={isEditMode}
                        onEdit={handleOpenEdit}
                        onDelete={handleDelete}
                        onSetLevel={handleSetLevel}
                        dragHandle={dragHandle}
                      />
                    )}
                  </ReorderableList>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Skill Form Modal */}
      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSkill ? t("Editar Habilidade", "Edit Skill") : t("Adicionar Habilidade", "Add Skill")}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Editing Language Toggle */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 font-sans">
                {t("Idioma em Edição", "Language under Editing")}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 font-sans">
                {t(
                  "Alterne para preencher as informações em Português ou Inglês",
                  "Toggle to specify contents in Portuguese or English"
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0 font-sans">
              <TranslateButton
                onTranslate={handleAutoTranslateSkill}
                label={t("Traduzir PT → EN (Gemini AI)", "Auto-Translate PT → EN")}
                size="sm"
              />
              <div className="bg-slate-200/70 dark:bg-slate-700/70 p-1 rounded-xl flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditingLanguage("pt")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    editingLanguage === "pt"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  PT
                </button>
                <button
                  type="button"
                  onClick={() => setEditingLanguage("en")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    editingLanguage === "en"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          {lockedCategory && (
            <div className="flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-3 py-2 text-xs font-sans">
              <Tag className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">{t("Seção:", "Section:")}</span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                {editingLanguage === "en" ? lockedCategory.nameEn || lockedCategory.name : lockedCategory.name}
              </span>
            </div>
          )}

          {editingLanguage === "pt" ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
                Nome da Habilidade (Português) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Física Computacional, IoT, Inglês Fluente"
                value={skillForm.name || ""}
                onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                className={inputClasses}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
                Skill Name (English) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Computational Physics, IoT, Fluent English"
                value={skillForm.nameEn || ""}
                onChange={(e) => setSkillForm({ ...skillForm, nameEn: e.target.value })}
                className={inputClasses}
              />
            </div>
          )}

          {/* Category: only editable when moving an existing skill between sections */}
          {!lockedCategory && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
                {t("Seção", "Section")}
              </label>
              <select
                value={skillForm.category || ""}
                onChange={(e) => {
                  const chosen = mergedCategories.find((c) => c.name === e.target.value);
                  setSkillForm((prev) => ({
                    ...prev,
                    category: chosen?.name || e.target.value,
                    categoryEn: chosen?.nameEn || prev.categoryEn,
                  }));
                }}
                className={inputClasses}
              >
                {mergedCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {catDisplayName(c, editingLanguage)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Star rating picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
              {t("Proficiência / Nível", "Proficiency / Level")}
            </label>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5">
              <div className="flex items-center gap-0.5" onMouseLeave={() => setHoverLevel(null)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSkillForm({ ...skillForm, level: n })}
                    onMouseEnter={() => setHoverLevel(n)}
                    className="cursor-pointer p-0.5"
                    title={`${n}/5`}
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        n <= activeLevel
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-200 dark:text-slate-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono text-right shrink-0">
                {skillForm.level || 4}/5 — {language === "en" ? levelLabel.en : levelLabel.pt}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t("Cancelar", "Cancel")}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
            >
              {t("Salvar Alterações", "Save Changes")}
            </button>
          </div>
        </form>
      </EditModal>

      {/* New Section Modal */}
      <EditModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        title={t("Nova Seção", "New Section")}
      >
        <form onSubmit={handleSectionSubmit} className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 mb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-sans">
              {t("Preencha em português, ou traduza automaticamente.", "Fill in Portuguese, or auto-translate.")}
            </p>
            <TranslateButton
              onTranslate={handleAutoTranslateSection}
              label={t("Traduzir PT → EN", "Auto-Translate PT → EN")}
              size="sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
              {t("Nome da Seção (Português) *", "Section Name (Portuguese) *")}
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder={t("Ex: Física Computacional, Idiomas", "e.g. Computational Physics, Languages")}
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
              className={inputClasses}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
              {t("Nome da Seção (Inglês)", "Section Name (English)")}
            </label>
            <input
              type="text"
              placeholder={t("Ex: Computational Physics, Languages", "e.g. Computational Physics, Languages")}
              value={sectionForm.nameEn}
              onChange={(e) => setSectionForm({ ...sectionForm, nameEn: e.target.value })}
              className={inputClasses}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsSectionModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t("Cancelar", "Cancel")}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
            >
              {t("Criar Seção", "Create Section")}
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
        confirmText={confirmType === "info" ? t("Entendi", "Got it") : t("Excluir", "Delete")}
        cancelText={confirmType === "info" ? "" : t("Cancelar", "Cancel")}
        type={confirmType}
      />
    </section>
  );
}
