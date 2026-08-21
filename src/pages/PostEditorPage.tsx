import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { BlogPost } from "../types";
import { Language } from "../lib/translations";
import { findBySlug, slugOf } from "../utils/slug";
import { estimateReadTime } from "../utils/readTime";
import ArticleContentEditor from "../components/ArticleContentEditor";
import ImageSelectorInput from "../components/ImageSelectorInput";
import MarkdownRenderer from "../components/MarkdownRenderer";
import TranslateButton from "../components/TranslateButton";
import EditorActionRail from "../components/EditorActionRail";
import { autoTranslateFields } from "../lib/translator";
import { localePath } from "../lib/routes";
import { EditTargetState } from "../utils/editTarget";

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

  // Trecho que estava sendo lido quando se clicou "Editar" na página pública.
  const editTarget = (useLocation().state as EditTargetState | null)?.editTarget ?? null;

  const isNew = slug === "novo";
  const existing = useMemo(() => (isNew ? null : findBySlug(posts, slug)), [posts, slug, isNew]);

  const [form, setForm] = useState<Partial<BlogPost>>(() => existing ? { ...existing } : emptyPost());
  const [tagsInput, setTagsInput] = useState(() => (existing?.tags || []).join(", "));
  const [editingLanguage, setEditingLanguage] = useState<Language>(language);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [isDirty, setIsDirty] = useState(false);
  // Artigo novo nasce rascunho: publicar é uma decisão, não um efeito colateral.
  const [isDraft, setIsDraft] = useState(() => existing?.draft ?? true);

  /**
   * Qual botão pediu o envio. O formulário é submetido pela barra lateral, que
   * está fora dele, então a intenção chega por aqui e não por um argumento.
   */
  const draftIntentRef = useRef<boolean | null>(null);

  const submitAs = (draft: boolean) => {
    draftIntentRef.current = draft;
    const form = document.getElementById("post-editor-form") as HTMLFormElement | null;
    form?.requestSubmit();
  };

  // O artigo pode chegar depois do primeiro render, quando os dados da nuvem
  // terminam de carregar. Só sincronizamos enquanto nada foi editado, para não
  // descartar o que o autor já digitou.
  useEffect(() => {
    if (existing && !isDirty) {
      setForm({ ...existing });
      setTagsInput((existing.tags || []).join(", "));
      setIsDraft(existing.draft ?? false);
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
          onClick={() => navigate(localePath("/blog", language))}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
        >
          {language === "en" ? "Back to blog" : "Voltar ao blog"}
        </button>
      </div>
    );
  }

  const handleAutoTranslate = async () => {
    await autoTranslateFields(
      {
        titleEn: form.title || "",
        summaryEn: form.summary || "",
        contentEn: form.content || "",
      },
      setForm
    );
    setIsDirty(true);
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
      draft: draftIntentRef.current ?? isDraft,
    };

    onUpdatePosts(
      existing ? posts.map((p) => (p.id === existing.id ? complete : p)) : [complete, ...posts]
    );

    const draft = complete.draft ?? false;
    draftIntentRef.current = null;
    setIsDraft(draft);
    setIsDirty(false);

    // Um rascunho não tem página pública; ficamos no editor para continuar.
    if (!draft) navigate(localePath(`/blog/${slugOf(complete)}`, language));
  };

  const isEn = editingLanguage === "en";
  const previewTitle = (isEn ? form.titleEn : form.title) || (language === "en" ? "Untitled" : "Sem título");
  const previewContent = (isEn ? form.contentEn : form.content) || "";

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white";
  const labelClass =
    "mb-1 block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

  return (
    <div className="no-print mx-auto grid max-w-[1500px] gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="min-w-0 lg:order-1">
        {/* Escondido, e não desmontado, na prévia: a barra lateral submete este
            formulário pelo id, e um formulário fora do DOM não seria alcançado. */}
        <form
          id="post-editor-form"
          onSubmit={handleSave}
          className={view === "edit" ? "space-y-5" : "hidden"}
        >
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
                focusLine={editTarget?.field === "content" ? editTarget.line : undefined}
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

            {/* O estado de rascunho é decidido pelos botões da barra lateral —
                uma caixa aqui seria um segundo jeito de dizer a mesma coisa. */}
        </form>

        {view === "preview" && (
          <div>
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

      <aside className="lg:order-2">
        <EditorActionRail
          title={
            isNew
              ? language === "en" ? "New article" : "Novo artigo"
              : language === "en" ? "Edit article" : "Editar artigo"
          }
          isDirty={isDirty}
          isDraft={isDraft}
          onBack={() => navigate(localePath("/blog", language))}
          onSaveDraft={() => submitAs(true)}
          onPublish={() => submitAs(false)}
          views={["edit", "preview"]}
          view={view}
          onViewChange={setView}
          language={language}
        >
          <TranslateButton onTranslate={handleAutoTranslate} size="sm" />
        </EditorActionRail>
      </aside>
    </div>
  );
}
