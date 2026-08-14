import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye, PenTool, Columns2, FileText } from "lucide-react";
import { BlogPost } from "../types";
import { Language } from "../lib/translations";
import { findBySlug, slugOf } from "../utils/slug";
import { estimateReadTime } from "../utils/readTime";
import ArticleContentEditor from "../components/ArticleContentEditor";
import ImageSelectorInput from "../components/ImageSelectorInput";
import MarkdownRenderer from "../components/MarkdownRenderer";
import TranslateButton from "../components/TranslateButton";
import { translateFields } from "../lib/translator";

const CATEGORIES = [
  "Física Computacional",
  "Instrumentação",
  "Ciência dos Materiais",
  "Geral & Divulgação",
];

interface PostEditorPageProps {
  /** Trecho da URL: o `codigo`/`id` do artigo, ou "novo". */
  slug: string;
  posts: BlogPost[];
  onUpdatePosts: (posts: BlogPost[]) => void;
  language: Language;
}

const emptyPost = (): Partial<BlogPost> => ({
  title: "",
  titleEn: "",
  summary: "",
  summaryEn: "",
  content: "",
  contentEn: "",
  tags: [],
  imageUrl: "",
  readTime: "",
  date: new Date().toISOString().split("T")[0],
  category: "Instrumentação",
  categoryEn: "Instrumentation",
  draft: true,
});

export default function PostEditorPage({ slug, posts, onUpdatePosts, language }: PostEditorPageProps) {
  const navigate = useNavigate();

  const isNew = slug === "novo";
  const existing = useMemo(() => (isNew ? null : findBySlug(posts, slug)), [posts, slug, isNew]);

  const [form, setForm] = useState<Partial<BlogPost>>(() => existing ? { ...existing } : emptyPost());
  const [tagsInput, setTagsInput] = useState(() => (existing?.tags || []).join(", "));
  const [editingLanguage, setEditingLanguage] = useState<Language>(language);
  const [view, setView] = useState<"split" | "edit" | "preview">("split");
  const [isDirty, setIsDirty] = useState(false);

  // O artigo pode chegar depois do primeiro render, quando os dados da nuvem
  // terminam de carregar. Só sincronizamos enquanto nada foi editado, para não
  // descartar o que o autor já digitou.
  useEffect(() => {
    if (existing && !isDirty) {
      setForm({ ...existing });
      setTagsInput((existing.tags || []).join(", "));
    }
  }, [existing, isDirty]);

  const update = (patch: Partial<BlogPost>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  // Avisa antes de fechar a aba com edições pendentes.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  if (!isNew && !existing) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
        <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          {language === "en" ? "Article not found" : "Artigo não encontrado"}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {language === "en"
            ? "It may have been deleted, or the link is wrong."
            : "Ele pode ter sido excluído, ou o link está errado."}
        </p>
        <button
          onClick={() => navigate("/blog")}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
        >
          {language === "en" ? "Back to blog" : "Voltar ao blog"}
        </button>
      </div>
    );
  }

  const handleAutoTranslate = async () => {
    const translated = await translateFields({
      titleEn: form.title || "",
      summaryEn: form.summary || "",
      contentEn: form.content || "",
    });
    update({
      titleEn: translated.titleEn || form.titleEn || "",
      summaryEn: translated.summaryEn || form.summaryEn || "",
      contentEn: translated.contentEn || form.contentEn || "",
    });
    setEditingLanguage("en");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const content = form.content || "";
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    const complete: BlogPost = {
      // Preserva campos que o formulário não edita (codigo, tipo, projetos).
      ...existing,
      id: existing?.id || `post-${Date.now()}`,
      title: form.title || "Publicação Sem Título",
      titleEn: form.titleEn || "",
      summary: form.summary || "",
      summaryEn: form.summaryEn || "",
      content,
      contentEn: form.contentEn || "",
      date: form.date || new Date().toISOString().split("T")[0],
      tags,
      imageUrl: form.imageUrl || undefined,
      readTime: form.readTime?.trim() || estimateReadTime(content, "pt"),
      category: form.category || "Instrumentação",
      categoryEn: form.categoryEn || "Instrumentation",
      draft: form.draft ?? false,
    };

    onUpdatePosts(
      existing ? posts.map((p) => (p.id === existing.id ? complete : p)) : [complete, ...posts]
    );

    setIsDirty(false);
    navigate(`/blog/${slugOf(complete)}`);
  };

  const isEn = editingLanguage === "en";
  const previewTitle = (isEn ? form.titleEn : form.title) || (language === "en" ? "Untitled" : "Sem título");
  const previewContent = (isEn ? form.contentEn : form.content) || "";

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white";
  const labelClass =
    "mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

  return (
    <div className="no-print">
      {/* Barra de ações fixa */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:-mx-8 sm:px-8 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/blog")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {language === "en" ? "Back" : "Voltar"}
          </button>
          <div>
            <h1 className="font-display text-sm font-bold text-slate-900 sm:text-base dark:text-white">
              {isNew
                ? language === "en" ? "New article" : "Novo artigo"
                : language === "en" ? "Edit article" : "Editar artigo"}
            </h1>
            {isDirty && (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                {language === "en" ? "Unsaved changes" : "Alterações não salvas"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternância de visualização */}
          <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 md:flex dark:border-slate-700 dark:bg-slate-800/80">
            {([
              ["edit", PenTool, language === "en" ? "Write" : "Escrever"],
              ["split", Columns2, language === "en" ? "Split" : "Dividido"],
              ["preview", Eye, language === "en" ? "Preview" : "Prévia"],
            ] as const).map(([mode, Icon, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                title={label}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                  view === mode
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-950 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>

          <TranslateButton onTranslate={handleAutoTranslate} size="sm" />

          <button
            type="submit"
            form="post-editor-form"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-indigo-700"
          >
            <Save className="h-3.5 w-3.5" />
            {language === "en" ? "Save" : "Salvar"}
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${view === "split" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Formulário */}
        {view !== "preview" && (
          <form id="post-editor-form" onSubmit={handleSave} className="space-y-5">
            {/* Alternância pt/en */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/80">
              {(["pt", "en"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setEditingLanguage(lang)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase transition-colors ${
                    editingLanguage === lang
                      ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-950 dark:text-indigo-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {lang === "pt" ? "Português" : "English"}
                </button>
              ))}
            </div>

            <div>
              <label className={labelClass}>{isEn ? "Title (EN)" : "Título"}</label>
              <input
                type="text"
                required={!isEn}
                value={(isEn ? form.titleEn : form.title) || ""}
                onChange={(e) => update(isEn ? { titleEn: e.target.value } : { title: e.target.value })}
                className={fieldClass}
                placeholder={isEn ? "Article title" : "Título do artigo"}
              />
            </div>

            <div>
              <label className={labelClass}>{isEn ? "Summary (EN)" : "Resumo"}</label>
              <textarea
                rows={3}
                value={(isEn ? form.summaryEn : form.summary) || ""}
                onChange={(e) => update(isEn ? { summaryEn: e.target.value } : { summary: e.target.value })}
                className={`${fieldClass} resize-y`}
                placeholder={isEn ? "One paragraph shown on cards" : "Um parágrafo, exibido nos cartões"}
              />
            </div>

            <div>
              <label className={labelClass}>{isEn ? "Content (EN)" : "Conteúdo"}</label>
              <ArticleContentEditor
                label=""
                value={(isEn ? form.contentEn : form.content) || ""}
                onChange={(val) => update(isEn ? { contentEn: val } : { content: val })}
                language={language}
                articleTitle={form.title || ""}
                rows={20}
              />
            </div>

            <div>
              <label className={labelClass}>{language === "en" ? "Cover image" : "Imagem de capa"}</label>
              <ImageSelectorInput
                label=""
                value={form.imageUrl || ""}
                onChange={(val) => update({ imageUrl: val })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{language === "en" ? "Category" : "Categoria"}</label>
                <select
                  value={form.category || "Instrumentação"}
                  onChange={(e) => update({ category: e.target.value })}
                  className={fieldClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{language === "en" ? "Date" : "Data"}</label>
                <input
                  type="date"
                  required
                  value={form.date || ""}
                  onChange={(e) => update({ date: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Tags</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => { setTagsInput(e.target.value); setIsDirty(true); }}
                  className={fieldClass}
                  placeholder="Python, Óptica, PyVISA"
                />
              </div>
              <div>
                <label className={labelClass}>{language === "en" ? "Reading time" : "Tempo de leitura"}</label>
                <input
                  type="text"
                  value={form.readTime || ""}
                  onChange={(e) => update({ readTime: e.target.value })}
                  className={fieldClass}
                  placeholder={estimateReadTime(form.content || "", language)}
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {language === "en" ? "Blank calculates from the text." : "Em branco, calcula pelo texto."}
                </p>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
              <input
                type="checkbox"
                checked={form.draft ?? false}
                onChange={(e) => update({ draft: e.target.checked })}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-sans text-xs">
                <span className="block font-bold text-slate-700 dark:text-slate-200">
                  {language === "en" ? "Draft" : "Rascunho"}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {language === "en"
                    ? "Only you see it, and only in edit mode."
                    : "Só você enxerga, e apenas no modo de edição."}
                </span>
              </span>
            </label>
          </form>
        )}

        {/* Pré-visualização */}
        {view !== "edit" && (
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {language === "en" ? "Preview" : "Pré-visualização"}
              </p>
              <h2 className="font-display text-2xl font-black leading-tight text-slate-900 dark:text-white">
                {previewTitle}
              </h2>
              <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-slate-400">
                <span>{form.date}</span>
                <span>·</span>
                <span>{form.readTime || estimateReadTime(form.content || "", language)}</span>
              </div>
              <div className="mt-6">
                {previewContent ? (
                  <MarkdownRenderer content={previewContent} />
                ) : (
                  <p className="text-sm italic text-slate-400">
                    {language === "en"
                      ? "Start writing to see the preview."
                      : "Comece a escrever para ver a prévia."}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
