import React, { useState } from "react";
import { FlaskConical, Plus, Edit2, Trash2, ExternalLink, AlertCircle } from "lucide-react";
import { Experience, Subperiod, Project } from "../types";
import EditModal from "./EditModal";
import MarkdownRenderer from "./MarkdownRenderer";
import TranslateButton from "./TranslateButton";
import ProjetosRelacionados from "./ProjetosRelacionados";
import { ReorderableList } from "./Reorderable";
import { SECTION_CARD_CLASS } from "../lib/cardStyle";
import { Language } from "../lib/translations";
import { autoTranslateFields } from "../lib/translator";
import { formatarPeriodo } from "../lib/periodo";

interface ExperienciasCardProps {
  experiences: Experience[];
  projects: Project[];
  isEditMode: boolean;
  onUpdateExperiences: (updated: Experience[]) => void;
  language?: Language;
  /** Pede a confirmação de exclusão ao dono do modal compartilhado. */
  pedirConfirmacao: (titulo: string, mensagem: string, acao: () => void) => void;
}

/**
 * Experiência em pesquisa: a lista e o formulário que a edita.
 *
 * A maior das três seções, e a única com subperíodos — um vínculo longo se
 * divide em etapas com título e datas próprias, e o formulário tem um bloco
 * inteiro para montá-las.
 */
export default function ExperienciasCard({
  experiences,
  projects,
  isEditMode,
  onUpdateExperiences,
  language = "pt",
  pedirConfirmacao,
}: ExperienciasCardProps) {
  const [editingLanguage, setEditingLanguage] = useState<Language>("pt");
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
    pedirConfirmacao(
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

  return (
    <>
      {/* SEÇÃO 2: EXPERIÊNCIA EM PESQUISA (Research Experience) */}
      <section
        id="pesquisa"
        className={SECTION_CARD_CLASS}
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
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500 font-medium">
              Nenhuma experiência em pesquisa cadastrada.
            </p>
          </div>
        ) : (
          /* Linha do tempo: um fio contínuo atrás de todo mundo, marcador por
             vínculo. Antes cada experiência era um cartão independente com a
             data num selo à direita — lia-se cada uma isolada, sem noção de
             que "iniciação científica" é a MESMA linha de pesquisa em dois
             períodos consecutivos. O fio é o que mostra isso de relance. */
          <div className="relative">
            <div
              aria-hidden="true"
              className="timeline-rail pointer-events-none absolute left-[5px] top-1 bottom-1 w-0.5 bg-borda"
            />
            <ReorderableList
              items={experiences}
              isEditMode={isEditMode}
              onReorder={onUpdateExperiences}
              getKey={(exp) => exp.id}
              className="space-y-7"
              itemClassName="group relative pl-8 print-break-inside-avoid"
            >
              {(exp, dragHandle) => {
              const roleText = language === "en" && exp.roleEn ? exp.roleEn : exp.role;
              const locationText = language === "en" && exp.locationEn ? exp.locationEn : exp.location;
              const descText = language === "en" && exp.descriptionEn ? exp.descriptionEn : exp.description;
              const hasDescription = descText && descText.trim().length > 0;
              const anchorId = "research-" + exp.id;

              return (
                <div id={anchorId}>
                  {/* Marcador: cheio e levemente maior enquanto em curso,
                      vazado (a cor do papel por dentro) para vínculos
                      encerrados — a mesma leitura de um "você está aqui". */}
                  <span
                    aria-hidden="true"
                    className={
                      "timeline-dot pointer-events-none absolute left-0 top-1 h-3 w-3 rounded-full ring-4 ring-superficie " +
                      (exp.current ? "bg-acento" : "border-2 border-acento bg-superficie")
                    }
                  />

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
                          {formatarPeriodo(exp.startDate, exp.endDate, exp.current, language)}
                        </div>

                        {isEditMode && (
                          <div className="flex items-center gap-1 no-print print:hidden">
                            {dragHandle}
                            <button
                              onClick={() => handleOpenExpEdit(exp)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                              title="Editar Pesquisa" aria-label="Editar Pesquisa"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExp(exp.id)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Excluir Pesquisa" aria-label="Excluir Pesquisa"
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
                        <p className="text-xs text-slate-500 dark:text-slate-500 italic">
                          descrição pendente
                        </p>
                      ) : null}
                    </div>

                    {/* Subperíodos: as etapas dentro de um mesmo vínculo — o
                        mesmo desenho da linha de cima, em escala menor, para
                        ler como filho dela e não como uma lista solta. */}
                    {exp.subperiods && exp.subperiods.length > 0 && (
                      <div className="relative my-3.5 space-y-3">
                        <div
                          aria-hidden="true"
                          className="timeline-rail-sub pointer-events-none absolute left-[3px] top-1 bottom-1 w-px bg-borda"
                        />
                        {exp.subperiods.map((sub) => {
                          const subTitleText = language === "en" && sub.titleEn ? sub.titleEn : sub.title;
                          const subDescText = language === "en" && sub.descriptionEn ? sub.descriptionEn : sub.description;
                          const subHasText = (subTitleText && subTitleText.trim()) || (subDescText && subDescText.trim());

                          return (
                            <div key={sub.id} className="relative space-y-0.5 pl-5">
                              <span
                                aria-hidden="true"
                                className={
                                  "timeline-dot-sub pointer-events-none absolute left-0 top-[3px] h-2 w-2 rounded-full ring-2 ring-superficie " +
                                  (sub.current ? "bg-tinta-fraca" : "border border-tinta-fraca bg-superficie")
                                }
                              />
                              {/* Período em monoespaçada 11px */}
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 block">
                                {formatarPeriodo(sub.startDate, sub.endDate, sub.current, language)}
                              </span>

                              {/* Linha de descrição do subperíodo */}
                              {subHasText ? (
                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 font-sans">
                                  {subTitleText || subDescText}
                                </p>
                              ) : isEditMode ? (
                                <p className="text-xs text-slate-500 dark:text-slate-500 italic font-sans">
                                  {subTitleText ? subTitleText + " — " : ""}descrição pendente
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
                    <ProjetosRelacionados projectCodes={exp.projetos} projects={projects} isEditMode={isEditMode} language={language} />
                  </div>
                </div>
              );
              }}
            </ReorderableList>
          </div>
        )}
      </section>

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
            <span className="text-[10px] text-slate-500">
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
                        {formatarPeriodo(sub.startDate, sub.endDate, sub.current, language)}
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
    </>
  );
}
