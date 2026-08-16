import React, { useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { Skill } from "../types";
import { Award, Plus, Edit2, Trash2, Star, Tag, Check, GripVertical } from "lucide-react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import { Language } from "../lib/translations";
import TranslateButton from "./TranslateButton";
import { translateFields } from "../lib/translator";

interface SkillsSectionProps {
  skills: Skill[];
  isEditMode: boolean;
  onUpdateSkills: (updatedSkills: Skill[]) => void;
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
}

// Inner content shared between the plain (read-only) and draggable (edit mode) rows.
function SkillRowContent({ skill, language, accent, isEditMode, onEdit, onDelete, dragHandleProps }: SkillRowProps & { dragHandleProps?: React.HTMLAttributes<HTMLButtonElement> }) {
  return (
    <div className="flex items-start gap-2">
      {isEditMode && (
        <button
          type="button"
          {...dragHandleProps}
          className="mt-0.5 shrink-0 touch-none cursor-grab text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity no-print print:hidden"
          title={language === "en" ? "Drag to reorder" : "Arrastar para reordenar"}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans">
            {language === "en" && skill.nameEn ? skill.nameEn : skill.name}
          </span>

          {/* Level number or star count for print stability */}
          <div className="flex items-center gap-1">
            {/* Level bar or dots */}
            <div className="flex gap-0.5 print:hidden">
              {[1, 2, 3, 4, 5].map((level) => (
                <Star
                  key={level}
                  className={`h-3 w-3 ${
                    level <= skill.level
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200 dark:text-slate-700"
                  }`}
                />
              ))}
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
            style={{ width: `${(skill.level / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Admin Tools */}
      {isEditMode && (
        <div className="absolute right-0 top-0 flex sm:opacity-0 sm:group-hover:opacity-100 opacity-100 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 gap-0.5 z-10 no-print print:hidden transition-opacity duration-200">
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

// Draggable row used in edit mode (must live inside a Reorder.Group).
function DraggableSkillRow(props: SkillRowProps) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={props.skill}
      dragListener={false}
      dragControls={controls}
      className="group relative"
    >
      <SkillRowContent {...props} dragHandleProps={{ onPointerDown: (e) => controls.start(e) }} />
    </Reorder.Item>
  );
}

export default function SkillsSection({ skills, isEditMode, onUpdateSkills, language = "pt" }: SkillsSectionProps) {
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [hoverLevel, setHoverLevel] = useState<number | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setConfirmOpen(true);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillForm, setSkillForm] = useState<Partial<Skill>>({
    name: "",
    nameEn: "",
    category: "",
    categoryEn: "",
    level: 4,
  });

  const handleAutoTranslateSkill = async () => {
    const fieldsToTranslate = {
      nameEn: skillForm.name || "",
      categoryEn: skillForm.category || "",
    };

    const translated = await translateFields(fieldsToTranslate);

    setSkillForm((prev) => ({
      ...prev,
      nameEn: translated.nameEn || prev.nameEn || "",
      categoryEn: translated.categoryEn || prev.categoryEn || "",
    }));

    setEditingLanguage("en");
  };

  // Helper to translate legacy/known categories that don't have a saved categoryEn.
  const getCategoryName = (cat: string, lang: Language) => {
    if (lang === "en") {
      if (cat === "Física Computacional") return "Computational Physics";
      if (cat === "Instrumentação & IoT") return "Instrumentation & IoT";
      if (cat === "Ciência dos Materiais") return "Materials Science";
      if (cat === "Física Teórica") return "Theoretical Physics";
      if (cat === "Idiomas") return "Languages";
      if (cat === "Outros") return "Others";
    }
    return cat;
  };

  // Group skills by category dynamically, preserving first-seen order.
  const categories = Array.from(new Set(skills.map((s) => s.category)));

  // Reordering only moves skills within the same category — other categories'
  // positions in the underlying flat array are left untouched.
  const handleReorderCategory = (cat: string, reorderedCatSkills: Skill[]) => {
    let i = 0;
    const merged = skills.map((s) => (s.category === cat ? reorderedCatSkills[i++] : s));
    onUpdateSkills(merged);
  };

  // Suggestions shown as clickable chips in the add/edit form, per language.
  const ptCategorySuggestions = Array.from(new Set(skills.map((s) => s.category).filter(Boolean)));
  const enCategorySuggestions = Array.from(new Set(skills.map((s) => s.categoryEn).filter(Boolean) as string[]));

  const handleOpenAdd = () => {
    setEditingSkill(null);
    setSkillForm({ name: "", nameEn: "", category: ptCategorySuggestions[0] || "", categoryEn: "", level: 4 });
    setEditingLanguage(language);
    setHoverLevel(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillForm({ ...skill });
    setEditingLanguage(language);
    setHoverLevel(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const confirmTitle = language === "en" ? "Delete Skill" : "Excluir Habilidade";
    const confirmMsg = language === "en"
      ? "Are you sure you want to delete this skill?"
      : "Deseja realmente excluir esta habilidade?";

    triggerConfirm(confirmTitle, confirmMsg, () => {
      onUpdateSkills(skills.filter((s) => s.id !== id));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const complete: Skill = {
      id: editingSkill?.id || `skill-${Date.now()}`,
      name: skillForm.name || "Nova Habilidade",
      nameEn: skillForm.nameEn || "",
      category: skillForm.category || "Outros",
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
  const categorySuggestions = editingLanguage === "pt" ? ptCategorySuggestions : enCategorySuggestions;
  const categoryFieldKey = editingLanguage === "pt" ? "category" : "categoryEn";
  const categoryFieldValue = (editingLanguage === "pt" ? skillForm.category : skillForm.categoryEn) || "";

  return (
    <section id="habilidades" className="scroll-mt-32 mb-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 shadow-xs print-border print-shadow-none print-m-0 transition-colors duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-2.5 text-indigo-600 dark:text-indigo-400 print-border">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              {language === "en" ? "Skills & Competencies" : "Habilidades & Competências"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">
              {language === "en"
                ? "My technical qualifications, frameworks and work tools."
                : "Minhas qualificações técnicas, frameworks e ferramentas de trabalho."}
            </p>
          </div>
        </div>

        {isEditMode && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 no-print print:hidden cursor-pointer"
            id="add-skill-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            {language === "en" ? "Add" : "Adicionar"}
          </button>
        )}
      </div>

      {skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center font-sans">
          <Award className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            {language === "en" ? "No competencies added." : "Nenhuma competência adicionada."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-2 print:gap-4">
          {categories.map((cat, idx) => {
            const catSkills = skills.filter((s) => s.category === cat);
            const accent = getCategoryAccent(idx);
            return (
              <div
                key={`skill-cat-${cat}-${idx}`}
                className="rounded-xl border border-slate-100/50 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 p-5 print-border print-bg-transparent print-break-inside-avoid"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${accent.bg} ${accent.text} print-border print-bg-none`}>
                    <Tag className="h-3 w-3" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-sans">
                    {language === "en" ? getCategoryName(cat, "en") : cat}
                  </h3>
                  <span className="ml-auto text-[10px] font-mono font-semibold text-slate-300 dark:text-slate-600">
                    {catSkills.length}
                  </span>
                </div>

                {isEditMode ? (
                  <Reorder.Group
                    as="div"
                    axis="y"
                    values={catSkills}
                    onReorder={(newOrder) => handleReorderCategory(cat, newOrder as Skill[])}
                    className="space-y-4"
                  >
                    {catSkills.map((skill) => (
                      <DraggableSkillRow
                        key={skill.id}
                        skill={skill}
                        language={language}
                        accent={accent}
                        isEditMode={isEditMode}
                        onEdit={handleOpenEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </Reorder.Group>
                ) : (
                  <div className="space-y-4">
                    {catSkills.map((skill) => (
                      <div key={skill.id} className="group relative">
                        <SkillRowContent
                          skill={skill}
                          language={language}
                          accent={accent}
                          isEditMode={false}
                          onEdit={handleOpenEdit}
                          onDelete={handleDelete}
                        />
                      </div>
                    ))}
                  </div>
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
        title={editingSkill ? (language === "en" ? "Edit Skill" : "Editar Habilidade") : (language === "en" ? "Add Skill" : "Adicionar Habilidade")}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Editing Language Toggle */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 font-sans">
                {language === "en" ? "Language under Editing" : "Idioma em Edição"}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                {language === "en"
                  ? "Toggle to specify contents in Portuguese or English"
                  : "Alterne para preencher as informações em Português ou Inglês"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0 font-sans">
              <TranslateButton
                onTranslate={handleAutoTranslateSkill}
                label={language === "en" ? "Auto-Translate PT → EN" : "Traduzir PT → EN (Gemini AI)"}
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

          {/* Category picker: click an existing category or type a new one */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
              {language === "en" ? "Category" : "Categoria"}
            </label>

            {categorySuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categorySuggestions.map((cat) => {
                  const isSelected = categoryFieldValue === cat;
                  return (
                    <button
                      key={`cat-chip-${cat}`}
                      type="button"
                      onClick={() => setSkillForm({ ...skillForm, [categoryFieldKey]: cat })}
                      className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <input
              type="text"
              required
              placeholder={
                editingLanguage === "pt"
                  ? "Ou digite uma nova categoria (Ex: Física Computacional, Idiomas)"
                  : "Or type a new category (e.g. Computational Physics, Languages)"
              }
              value={categoryFieldValue}
              onChange={(e) => setSkillForm({ ...skillForm, [categoryFieldKey]: e.target.value })}
              className={inputClasses}
            />
          </div>

          {/* Star rating picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-sans">
              {language === "en" ? "Proficiency / Level" : "Proficiência / Nível"}
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
              {language === "en" ? "Cancel" : "Cancelar"}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
            >
              {language === "en" ? "Save Changes" : "Salvar Alterações"}
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
    </section>
  );
}
