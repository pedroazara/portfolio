import React, { useState } from "react";
import { Skill } from "../types";
import { Award, Plus, Edit2, Trash2, Star } from "lucide-react";
import EditModal from "./EditModal";
import ConfirmModal from "./ConfirmModal";
import { Language, translations } from "../lib/translations";

interface SkillsSectionProps {
  skills: Skill[];
  isEditMode: boolean;
  onUpdateSkills: (updatedSkills: Skill[]) => void;
  language?: Language;
}

export default function SkillsSection({ skills, isEditMode, onUpdateSkills, language = "pt" }: SkillsSectionProps) {
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillForm, setSkillForm] = useState<Partial<Skill>>({
    name: "",
    nameEn: "",
    category: "Frontend",
    categoryEn: "",
    level: 4,
  });

  // Helper to translate categories
  const getCategoryName = (cat: string, lang: Language) => {
    // If the skill has a specific English category saved, we could use that,
    // but we can also map standard ones or let the user edit them.
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

  // Group skills by category dynamically
  const categories = Array.from(new Set(skills.map((s) => s.category)));

  const handleOpenAdd = () => {
    setEditingSkill(null);
    setSkillForm({ name: "", nameEn: "", category: "Frontend", categoryEn: "", level: 4 });
    setEditingLanguage(language);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillForm({ ...skill });
    setEditingLanguage(language);
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
      category: skillForm.category || "Frontend",
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
          {categories.map((cat) => {
            const catSkills = skills.filter((s) => s.category === cat);
            return (
              <div
                key={cat}
                className="rounded-xl border border-slate-100/50 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 p-5 print-border print-bg-transparent print-break-inside-avoid"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono mb-4 border-b border-slate-100 dark:border-slate-800 pb-1">
                  {language === "en" ? getCategoryName(cat, "en") : cat}
                </h3>

                <div className="space-y-4">
                  {catSkills.map((skill) => (
                    <div key={skill.id} className="group relative flex flex-col gap-1.5">
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

                      {/* Visual progress bar (extremely clean design) */}
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden print:hidden">
                        <div
                          className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
                          style={{ width: `${(skill.level / 5) * 100}%` }}
                        ></div>
                      </div>

                      {/* Admin Tools */}
                      {isEditMode && (
                        <div className="absolute right-0 top-0 flex sm:opacity-0 sm:group-hover:opacity-100 opacity-100 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 gap-0.5 z-10 no-print print:hidden transition-opacity duration-200">
                          <button
                            onClick={() => handleOpenEdit(skill)}
                            className="p-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Editar Habilidade"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(skill.id)}
                            className="p-0.5 rounded text-rose-600 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Excluir Habilidade"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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

          {editingLanguage === "pt" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Nome da Habilidade (Português) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Física Computacional, IoT, Inglês Fluente"
                value={skillForm.name || ""}
                onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                Skill Name (English) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Computational Physics, IoT, Fluent English"
                value={skillForm.nameEn || ""}
                onChange={(e) => setSkillForm({ ...skillForm, nameEn: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Category" : "Categoria"}
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Física Computacional, Idiomas, Outros"
                value={skillForm.category || ""}
                onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
                list="skill-categories"
              />
              <datalist id="skill-categories">
                <option value="Física Computacional" />
                <option value="Instrumentação & IoT" />
                <option value="Ciência dos Materiais" />
                <option value="Física Teórica" />
                <option value="Idiomas" />
                <option value="Outros" />
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                {language === "en" ? "Proficiency / Level" : "Proficiência / Nível"}
              </label>
              <select
                required
                value={skillForm.level || 4}
                onChange={(e) => setSkillForm({ ...skillForm, level: parseInt(e.target.value, 10) })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden font-sans"
              >
                <option value={1}>{language === "en" ? "1 - Beginner" : "1 - Iniciante"}</option>
                <option value={2}>{language === "en" ? "2 - Basic / Intermediate" : "2 - Básico / Intermediário"}</option>
                <option value={3}>{language === "en" ? "3 - Comfortable / Good" : "3 - Confortável / Bom"}</option>
                <option value={4}>{language === "en" ? "4 - Advanced / Great" : "4 - Avançado / Ótimo"}</option>
                <option value={5}>{language === "en" ? "5 - Expert / Excellent" : "5 - Especialista / Excelente"}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
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
