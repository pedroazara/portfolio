import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, PenTool, Eye, Sparkles, FolderKanban, Check, ExternalLink, Github, 
  ImageIcon, FlaskConical, BookOpen, Star, Plus, Trash2, RefreshCw, Link2, Share2, Clock
} from "lucide-react";
import { Project, ProjectCategory } from "../types";
import { Language } from "../lib/translations";
import ImageSelectorInput from "./ImageSelectorInput";
import ImageGalleryInput from "./ImageGalleryInput";
import ArticleContentEditor from "./ArticleContentEditor";
import MarkdownRenderer from "./MarkdownRenderer";
import TranslateButton from "./TranslateButton";
import { autoTranslateFields } from "../lib/translator";
import { projectFolder } from "../utils/imageDb";
import { EditTarget, scrollTextareaToLine } from "../utils/editTarget";
import LocalImage from "./LocalImage";

/** Slug de URL a partir de um título: minúsculas, sem acentos, hífens. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Limpeza enquanto se digita o endereço.
 *
 * Diferente de `slugify`, mantém o hífen do fim: quem escreve "bomba-" está a
 * meio caminho de "bomba-de-seringa", e apagar o hífen a cada tecla tornaria o
 * campo impossível de usar. O acerto final fica para o envio.
 */
function sanitizeSlugInput(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
}

interface ProjectFormProps {
  project: Partial<Project> | null;
  categories: ProjectCategory[];
  onUpdateCategories?: (categories: ProjectCategory[]) => void;
  onSave: (project: Project) => void;
  language?: Language;
  /** Escrever ou pré-visualizar. A barra de ações da página controla. */
  view?: "edit" | "preview";
  /** Avisa a página quando há alterações pendentes. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Trecho que estava sendo lido quando se pediu a edição. */
  editTarget?: EditTarget | null;
  /** Endereços já ocupados por outros projetos, para não haver dois iguais. */
  reservedSlugs?: string[];
}

/**
 * Formulário de projeto.
 *
 * O botão de salvar vive na barra de ações da página e alcança este formulário
 * pelo atributo `form="project-editor-form"` — por isso não há cabeçalho, abas
 * nem botões de salvar aqui dentro. Antes existiam dois de cada: um no topo do
 * editor e outro no rodapé do formulário, além do "Voltar" da própria página.
 */

export default function ProjectForm({
  project,
  categories,
  onSave,
  language = "pt",
  view = "edit",
  onDirtyChange,
  editTarget = null,
  reservedSlugs = [],
}: ProjectFormProps) {
  const activeTab = view;
  const [editingLanguage, setEditingLanguage] = useState<Language>(language);

  // Form State
  const [formData, setFormData] = useState<Partial<Project>>({
    title: "",
    titleEn: "",
    description: "",
    descriptionEn: "",
    categoryId: categories[0]?.id || "",
    categoryIds: categories[0] ? [categories[0].id] : [],
    tags: [],
    projectUrl: "",
    githubUrl: "",
    imageUrl: "",
    detailedDescription: "",
    detailedDescriptionEn: "",
    scientificRelevance: "",
    scientificRelevanceEn: "",
    galleryImages: [],
    featured: false,
  });

  const [tagsInput, setTagsInput] = useState("");
  const [slugError, setSlugError] = useState("");

  // Envios da galeria vão para a pasta do próprio projeto quando ele já tem
  // código; um projeto ainda sem código cai na pasta geral.
  const galleryFolder = formData.codigo ? projectFolder(formData.codigo) : undefined;

  /**
   * Estado do formulário no momento em que ele foi carregado.
   *
   * Comparar com este retrato diz se há alterações pendentes sem exigir que
   * cada campo chame um `markDirty` — um só esquecimento deixaria o aviso de
   * "alterações não salvas" mentindo.
   */
  const baselineRef = useRef<string>("");

  useEffect(() => {
    const agora = JSON.stringify({ formData, tagsInput });
    // A primeira passagem define a referência; daí em diante, comparamos.
    if (!baselineRef.current) {
      baselineRef.current = agora;
      return;
    }
    onDirtyChange?.(agora !== baselineRef.current);
  }, [formData, tagsInput, onDirtyChange]);
  const [showLinkFields, setShowLinkFields] = useState(false);

  useEffect(() => {
    if (project) {
      const initialCategoryIds = project.categoryIds && project.categoryIds.length > 0
        ? project.categoryIds
        : (project.categoryId ? [project.categoryId] : (categories[0] ? [categories[0].id] : []));

      setFormData({
        ...project,
        categoryIds: initialCategoryIds,
        categoryId: initialCategoryIds[0] || project.categoryId || (categories[0]?.id || ""),
      });
      setTagsInput((project.tags || []).join(", "));
    } else {
      const defaultCatId = categories[0]?.id || "";
      setFormData({
        title: "",
        titleEn: "",
        description: "",
        descriptionEn: "",
        categoryId: defaultCatId,
        categoryIds: defaultCatId ? [defaultCatId] : [],
        tags: [],
        projectUrl: "",
        githubUrl: "",
        imageUrl: "",
        detailedDescription: "",
        detailedDescriptionEn: "",
        scientificRelevance: "",
        scientificRelevanceEn: "",
        galleryImages: [],
        featured: false,
      });
      setTagsInput("");
    }
    setEditingLanguage(language);
    baselineRef.current = "";
  }, [project, language, categories]);

  /**
   * Relevância científica: campo simples, sem camada de destaque.
   *
   * Basta pousar o cursor na linha pedida e trazer o campo para a tela — o
   * texto é curto, então não há o que procurar depois disso.
   */
  const relevanceRef = useRef<HTMLTextAreaElement>(null);
  const alvoAtendidoRef = useRef(false);

  useEffect(() => {
    if (editTarget?.field !== "scientificRelevance" || alvoAtendidoRef.current) return;

    const textarea = relevanceRef.current;
    if (!textarea || !textarea.value) return;

    alvoAtendidoRef.current = true;
    const quadro = requestAnimationFrame(() => scrollTextareaToLine(textarea, editTarget.line));
    return () => cancelAnimationFrame(quadro);
  }, [editTarget, formData.scientificRelevance, formData.scientificRelevanceEn]);

  const handleAutoTranslate = async () => {
    await autoTranslateFields(
      {
        titleEn: formData.title || "",
        descriptionEn: formData.description || "",
        detailedDescriptionEn: formData.detailedDescription || "",
        scientificRelevanceEn: formData.scientificRelevance || "",
      },
      setFormData
    );
    // Troca para a aba EN na hora — sem isso, quem clicou "Traduzir"
    // continuava vendo os campos em português e podia achar que nada tinha
    // acontecido.
    setEditingLanguage("en");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Endereço do link: o que foi digitado, ou o título como antes.
    const codigo = slugify(formData.codigo || "") || slugify(formData.title || "");
    if (codigo && reservedSlugs.includes(codigo)) {
      setSlugError(
        language === "en"
          ? "Another project already uses this address."
          : "Outro projeto já usa este endereço."
      );
      return;
    }
    setSlugError("");

    /**
     * Renomear guarda o endereço anterior.
     *
     * Sem isso, o link que já circulou passa a responder "projeto não
     * encontrado" — foi o que aconteceu ao trocar `portfolio-site` por
     * `seriemapump`. Com o histórico, o endereço antigo continua levando aqui.
     */
    const codigoAnterior = project?.codigo;
    const historico = Array.from(
      new Set([
        ...(formData.codigosAntigos || []),
        ...(codigoAnterior && codigoAnterior !== codigo ? [codigoAnterior] : []),
      ])
    ).filter((antigo) => antigo !== codigo);

    const tagsArray = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const selectedCategoryIds = (formData.categoryIds && formData.categoryIds.length > 0)
      ? formData.categoryIds
      : (formData.categoryId ? [formData.categoryId] : (categories[0] ? [categories[0].id] : []));

    const completeProject: Project = {
      // Preserva os campos que o formulário não edita (codigo, draft, periodo,
      // stack, tipo, destaque...). Sem este spread, salvar um projeto apagava
      // silenciosamente esses campos — foi o que quebrou os links por `codigo`
      // e chegou a publicar rascunhos, já que `draft` também se perdia.
      ...formData,
      id: formData.id || `proj-${Date.now()}`,
      // O endereço do link é editável; em branco, volta a sair do título,
      // para a URL ser /projetos/meu-projeto e não /projetos/proj-1755....
      codigo: codigo || undefined,
      codigosAntigos: historico.length > 0 ? historico : undefined,
      title: formData.title || "Novo Projeto",
      titleEn: formData.titleEn || "",
      description: formData.description || "",
      descriptionEn: formData.descriptionEn || "",
      categoryId: selectedCategoryIds[0] || (categories[0]?.id || ""),
      categoryIds: selectedCategoryIds,
      tags: tagsArray,
      projectUrl: formData.projectUrl || undefined,
      githubUrl: formData.githubUrl || undefined,
      imageUrl: formData.imageUrl || undefined,
      detailedDescription: formData.detailedDescription || "",
      detailedDescriptionEn: formData.detailedDescriptionEn || "",
      scientificRelevance: formData.scientificRelevance || "",
      scientificRelevanceEn: formData.scientificRelevanceEn || "",
      galleryImages: formData.galleryImages || [],
      featured: formData.featured || false,
      emAndamento: formData.emAndamento || formData.status === "Em andamento" || formData.status === "In Progress",
      status: formData.emAndamento || formData.status === "Em andamento"
        ? "Em andamento"
        : (formData.status || undefined),
      blogPostId: formData.blogPostId || undefined,
    };

    onDirtyChange?.(false);
    onSave(completeProject);
  };

  // Selected Category Objects for preview
  const selectedCategoryIds = (formData.categoryIds && formData.categoryIds.length > 0)
    ? formData.categoryIds
    : (formData.categoryId ? [formData.categoryId] : []);
  const selectedCatObjs = categories.filter((c) => selectedCategoryIds.includes(c.id));

  // Content for preview mode
  const displayTitle = editingLanguage === "en" && formData.titleEn ? formData.titleEn : formData.title || "Título do Projeto";
  const displayDescription = editingLanguage === "en" && formData.descriptionEn ? formData.descriptionEn : formData.description || "";
  const displayDetailedDescription = editingLanguage === "en" && formData.detailedDescriptionEn ? formData.detailedDescriptionEn : formData.detailedDescription || "";
  const displayScientificRelevance = editingLanguage === "en" && formData.scientificRelevanceEn ? formData.scientificRelevanceEn : formData.scientificRelevance || "";

  // O conteúdo é idêntico nos dois modos; só o invólucro muda. Como página, a
  // altura não é limitada a 92vh e o scroll é o da própria janela.
  return (
    <div className="no-print">
            <div>
              {activeTab === "edit" ? (
                <form id="project-editor-form" onSubmit={handleSubmit} className="space-y-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-10 dark:border-slate-800 dark:bg-slate-900">

                  {/* Alternância pt/en + tradução automática de título, resumo,
                      corpo detalhado e relevância científica de uma vez. Antes
                      a função já existia (handleAutoTranslate), mas nada na
                      tela chamava — só a aba "Tradução" do painel cobria
                      título/resumo/categoria; o corpo detalhado e a relevância
                      científica nunca tinham tradução nenhuma. */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/80">
                      {(["pt", "en"] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setEditingLanguage(lang)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                            editingLanguage === lang
                              ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-950 dark:text-indigo-400"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {lang === "pt" ? "Português" : "English"}
                        </button>
                      ))}
                    </div>
                    <TranslateButton
                      onTranslate={handleAutoTranslate}
                      label={language === "en" ? "Auto-Translate PT → EN" : "Traduzir PT → EN (Gemini AI)"}
                      size="sm"
                    />
                  </div>

                  {/* 1. HERO COVER IMAGE SECTION */}
                  <div className="space-y-2">
                    <ImageSelectorInput
                      label={language === "en" ? "Cover Image" : "Imagem de Capa do Artigo/Projeto"}
                      value={formData.imageUrl || ""}
                      onChange={(val) => setFormData({ ...formData, imageUrl: val })}
                      placeholder="https://images.unsplash.com/photo-... ou db:nome.png"
                      id="project-editor-cover"
                    />
                  </div>

                  {/* 2. METADATA STRIP (CATEGORY, FEATURED, TAGS, LINKS) */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      
                      {/* Multi-Category Selector */}
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
                            {language === "en" ? "Specialty Areas (Multiple Selection):" : "Áreas de Atuação (Seleção Múltipla):"}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 font-semibold">
                            {(formData.categoryIds || []).length} {language === "en" ? "selected" : "selecionada(s)"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {categories.map((c) => {
                            const isSelected = (formData.categoryIds || []).includes(c.id);
                            const catName = (editingLanguage === "en" && c.nameEn) ? c.nameEn : c.name;
                            return (
                              <button
                                key={`cat-select-${c.id}`}
                                type="button"
                                onClick={() => {
                                  const current = formData.categoryIds || [];
                                  const next = current.includes(c.id)
                                    ? current.filter((id) => id !== c.id)
                                    : [...current, c.id];
                                  setFormData({
                                    ...formData,
                                    categoryIds: next,
                                    categoryId: next[0] || (categories[0]?.id || ""),
                                  });
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border ${
                                  isSelected
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                                }`}
                              >
                                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-white" />}
                                <span>{catName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Featured Toggle */}
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          formData.featured
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${formData.featured ? "fill-amber-500 text-amber-500" : ""}`} />
                        <span>{language === "en" ? "Featured Project" : "Projeto em Destaque"}</span>
                      </button>

                      {/* Em Andamento Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const isCurrentlyInProgress = formData.emAndamento || formData.status === "Em andamento" || formData.status === "In Progress";
                          const nextInProgress = !isCurrentlyInProgress;
                          setFormData({
                            ...formData,
                            emAndamento: nextInProgress,
                            status: nextInProgress
                              ? "Em andamento"
                              : undefined,
                          });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          formData.emAndamento || formData.status === "Em andamento" || formData.status === "In Progress"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${formData.emAndamento || formData.status === "Em andamento" || formData.status === "In Progress" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {language === "en"
                            ? (formData.emAndamento || formData.status === "Em andamento" || formData.status === "In Progress" ? "In Progress" : "Mark as In Progress")
                            : (formData.emAndamento || formData.status === "Em andamento" || formData.status === "In Progress" ? "Em Andamento" : "Em Andamento")}
                        </span>
                      </button>

                      {/* Links Drawer Toggle */}
                      <button
                        type="button"
                        onClick={() => setShowLinkFields(!showLinkFields)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          showLinkFields || formData.projectUrl || formData.githubUrl
                            ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        <span>{language === "en" ? "External Links & Demo" : "Links de Demo e Repositório"}</span>
                      </button>
                    </div>

                    {/* Collapsible External Links */}
                    {showLinkFields && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60"
                      >
                        <div>
                          <label className="block text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 text-indigo-500" />
                            <span>{language === "en" ? "Demo / Publication URL" : "URL de Demonstração / Artigo"}</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://meuprojeto.com"
                            value={formData.projectUrl || ""}
                            onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <Github className="h-3 w-3 text-indigo-500" />
                            <span>{language === "en" ? "Repository URL (GitHub)" : "URL do Repositório (GitHub)"}</span>
                          </label>
                          <input
                            type="text"
                            placeholder="https://github.com/usuario/projeto"
                            value={formData.githubUrl || ""}
                            onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Tags Input */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-1">
                        {language === "en" ? "Tags / Technologies (comma separated)" : "Tags / Tecnologias Utilizadas (separadas por vírgula)"}
                      </label>
                      <input
                        type="text"
                        placeholder="React, Python, MATLAB, Finite Element Method..."
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* 3. DISPLAY TITLE (ARTICLE H1) */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase font-mono tracking-wider text-slate-500">
                      {editingLanguage === "en" ? "Project Title (English)" : "Título do Projeto (Português)"} *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingLanguage === "en" ? formData.titleEn || "" : formData.title || ""}
                      onChange={(e) => {
                        if (editingLanguage === "en") {
                          setFormData({ ...formData, titleEn: e.target.value });
                        } else {
                          setFormData({ ...formData, title: e.target.value });
                        }
                      }}
                      placeholder={editingLanguage === "en" ? "Enter project title..." : "Digite o título do artigo ou projeto..."}
                      className="w-full text-2xl sm:text-3xl lg:text-4xl font-black font-display text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 bg-transparent border-b-2 border-slate-200 dark:border-slate-800 focus:border-indigo-600 dark:focus:border-indigo-500 focus:outline-hidden py-2 leading-tight transition-colors"
                    />

                    {/* Endereço do projeto no site. Nasce do título, mas quem
                        escreve manda: o título muda ao longo do tempo e o link
                        já compartilhado não deveria mudar junto. */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <label
                        htmlFor="project-codigo"
                        className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
                      >
                        {language === "en" ? "Link" : "Link"}
                      </label>
                      <div className={`flex min-w-0 flex-1 items-center rounded-lg border bg-white px-2.5 py-1.5 transition-colors focus-within:border-indigo-500 dark:bg-slate-900 ${
                        slugError
                          ? "border-rose-400 dark:border-rose-500"
                          : "border-slate-200 dark:border-slate-700"
                      }`}>
                        <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-500">/projetos/</span>
                        <input
                          id="project-codigo"
                          type="text"
                          value={formData.codigo || ""}
                          onChange={(e) => {
                            setSlugError("");
                            setFormData({ ...formData, codigo: sanitizeSlugInput(e.target.value) });
                          }}
                          onBlur={(e) => {
                            const limpo = slugify(e.target.value);
                            if (limpo !== e.target.value) setFormData({ ...formData, codigo: limpo });
                          }}
                          placeholder={slugify(formData.title || "") || "meu-projeto"}
                          className="w-full min-w-0 bg-transparent font-mono text-xs text-slate-800 placeholder-slate-300 focus:outline-hidden dark:text-slate-200 dark:placeholder-slate-700"
                        />
                      </div>
                    </div>
                    <p className={`font-sans text-[11px] ${slugError ? "text-rose-600 dark:text-rose-400" : "text-slate-500"}`}>
                      {slugError ||
                        (language === "en"
                          ? "Changing it breaks links already shared; mentions inside the site follow along."
                          : "Mudar quebra links já compartilhados; as menções dentro do site acompanham sozinhas.")}
                    </p>
                  </div>

                  {/* 4. LEAD SUMMARY CALLOUT BOX */}
                  <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 p-5 border-l-4 border-indigo-600 dark:border-indigo-500 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase font-mono tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{editingLanguage === "en" ? "Lead Summary (Displayed on Cards)" : "Resumo de Apresentação (Exibido no Card do Portfólio)"} *</span>
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={editingLanguage === "en" ? formData.descriptionEn || "" : formData.description || ""}
                      onChange={(e) => {
                        if (editingLanguage === "en") {
                          setFormData({ ...formData, descriptionEn: e.target.value });
                        } else {
                          setFormData({ ...formData, description: e.target.value });
                        }
                      }}
                      placeholder={editingLanguage === "en" ? "Write a compelling short summary for portfolio preview cards..." : "Escreva um resumo conciso e chamativo que descreva o objetivo e resultado principal do projeto..."}
                      className="w-full bg-transparent text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden resize-y placeholder-slate-400 dark:placeholder-slate-600 leading-relaxed"
                    />
                  </div>

                  {/* 5. MAIN ARTICLE CONTENT EDITOR */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                        {editingLanguage === "en" ? "Engineering & Technical Post Details" : "Detalhamento de Engenharia & Conteúdo Técnico"}
                      </h3>
                    </div>

                    <ArticleContentEditor
                      value={editingLanguage === "en" ? formData.detailedDescriptionEn || "" : formData.detailedDescription || ""}
                      onChange={(val) => {
                        if (editingLanguage === "en") {
                          setFormData({ ...formData, detailedDescriptionEn: val });
                        } else {
                          setFormData({ ...formData, detailedDescription: val });
                        }
                      }}
                      label=""
                      placeholder={editingLanguage === "en" ? "Write the detailed technical description using Markdown, LaTeX formulas, code blocks, tables, and images..." : "Escreva os detalhes técnicos do projeto usando Markdown, fórmulas em LaTeX ($E=mc^2$), tabelas, códigos e imagens..."}
                      language={editingLanguage}
                      articleTitle={formData.title || "projeto"}
                      rows={14}
                      focusLine={editTarget?.field === "detailedDescription" ? editTarget.line : undefined}
                    />
                  </div>

                  {/* 6. SCIENTIFIC & PHYSICAL RELEVANCE SECTION */}
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-5 border border-indigo-100 dark:border-indigo-950/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-mono">
                      <FlaskConical className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{editingLanguage === "en" ? "Scientific & Technological Relevance (Optional)" : "Relevância Científica & Aplicação Tecnológica (Opcional)"}</span>
                    </div>
                    <textarea
                      ref={relevanceRef}
                      rows={3}
                      value={editingLanguage === "en" ? formData.scientificRelevanceEn || "" : formData.scientificRelevance || ""}
                      onChange={(e) => {
                        if (editingLanguage === "en") {
                          setFormData({ ...formData, scientificRelevanceEn: e.target.value });
                        } else {
                          setFormData({ ...formData, scientificRelevance: e.target.value });
                        }
                      }}
                      placeholder={editingLanguage === "en" ? "Describe how this work impacts physical research, materials science, optics, cryogenics, etc..." : "Explique como este projeto contribui para a física aplicada, ciência dos materiais, instrumentação, óptica ou indústria..."}
                      className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden resize-y placeholder-slate-400 dark:placeholder-slate-600 leading-relaxed"
                    />
                  </div>

                  {/* 7. GALERIA */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                      <ImageIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {language === "en" ? "Gallery" : "Galeria de Imagens"}
                      </h3>
                    </div>

                    <ImageGalleryInput
                      value={formData.galleryImages || []}
                      onChange={(images) => setFormData({ ...formData, galleryImages: images })}
                      folder={galleryFolder}
                      language={language}
                    />
                  </div>

                </form>
              ) : (
                /* --- PREVIEW MODE (EXACT ARTICLE/POST READING VIEW) --- */
                <div className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                  {/* Hero Image */}
                  {formData.imageUrl && (
                    <div className="relative aspect-video sm:aspect-[21/9] w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
                      <LocalImage src={formData.imageUrl} alt={displayTitle} className="h-full w-full object-cover" />
                    </div>
                  )}

                  {/* Header Meta */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedCatObjs.length > 0 ? (
                        selectedCatObjs.map((cat) => {
                          const catName = (editingLanguage === "en" && cat.nameEn) ? cat.nameEn : cat.name;
                          return (
                            <span key={`preview-cat-${cat.id}`} className="rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                              {catName}
                            </span>
                          );
                        })
                      ) : (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                          {language === "en" ? "Uncategorized" : "Sem Categoria"}
                        </span>
                      )}
                      {formData.featured && (
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-500" />
                          <span>Destaque</span>
                        </span>
                      )}
                      {(formData.tags || []).map((t, i) => (
                        <span key={i} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-slate-900 dark:text-white leading-tight">
                      {displayTitle}
                    </h1>

                    {/* External Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {formData.projectUrl && (
                        <a
                          href={formData.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>{language === "en" ? "Live Demo / Paper" : "Demonstração / Artigo"}</span>
                        </a>
                      )}
                      {formData.githubUrl && (
                        <a
                          href={formData.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <Github className="h-3.5 w-3.5" />
                          <span>GitHub</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Lead Callout */}
                  {displayDescription && (
                    <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 p-5 sm:p-6 border-l-4 border-indigo-600 dark:border-indigo-500">
                      <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                        {displayDescription}
                      </p>
                    </div>
                  )}

                  {/* Main Article Content */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white mb-4">
                      {language === "en" ? "Project Overview & Engineering" : "Detalhamento de Engenharia"}
                    </h2>
                    <MarkdownRenderer content={displayDetailedDescription} />
                  </div>

                  {/* Scientific Relevance */}
                  {displayScientificRelevance && (
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-6 border border-indigo-100 dark:border-indigo-950/80 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-mono">
                        <FlaskConical className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{language === "en" ? "Scientific & Physical Relevance" : "Relevância Científica e Física"}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                        {displayScientificRelevance}
                      </p>
                    </div>
                  )}

                  {/* Gallery */}
                  {(formData.galleryImages || []).length > 0 && (
                    <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
                      <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">
                        {language === "en" ? "Gallery" : "Galeria de Imagens"}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {(formData.galleryImages || []).map((imgUrl, idx) => (
                          <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-100 dark:bg-slate-800">
                            <LocalImage src={imgUrl} alt={`Galeria ${idx + 1}`} className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
    </div>
  );
}
