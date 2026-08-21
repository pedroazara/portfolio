import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, X, Loader2, Search } from "lucide-react";
import { StoredImage, listImages, saveImage, fileNameOf, joinPath, GENERAL_FOLDER } from "../utils/imageDb";
import { processImagePreservingFormat } from "../utils/imageOptimizer";
import { Language } from "../lib/translations";
import { isDevPreview } from "../lib/devPreview";
import MarkdownHighlight, { EDITOR_TEXT_CLASS } from "./MarkdownHighlight";
import { scrollTextareaToLine } from "../utils/editTarget";

interface ArticleContentEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  label: string;
  placeholder?: string;
  helpText?: string;
  language?: Language;
  articleTitle?: string;
  required?: boolean;
  rows?: number;
  /**
   * Linha em que abrir o campo, vinda de quem clicou "Editar" durante a
   * leitura. Vale uma vez por chegada: reposicionar o cursor a cada digitação
   * seria brigar com quem está escrevendo.
   */
  focusLine?: number;
}

/** Imagens já referenciadas no texto, para a lista de remoção. */
function findEmbeddedImages(markdown: string) {
  const regex = /!\[([^\]]*)\]\((db:[^)]+|https?:[^)]+|data:image[^)]+)\)/g;
  const found: { alt: string; src: string; fullMatch: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown || "")) !== null) {
    found.push({ alt: match[1], src: match[2], fullMatch: match[0] });
  }
  return found;
}

/** Nome de arquivo seguro derivado do título do artigo. */
function slugify(text: string, max = 20): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

/**
 * Editor do corpo do artigo.
 *
 * Uma porta de entrada para imagens: o botão "Imagem", que abre o mesmo painel
 * para enviar um arquivo novo ou escolher um já salvo. Colar e arrastar
 * continuam funcionando — são atalhos invisíveis, anunciados uma única vez no
 * texto de exemplo.
 *
 * A versão anterior tinha cinco caminhos para a mesma ação (botão de envio,
 * alternador do banco, selo de Ctrl+V, arrastar e um segundo botão no estado
 * vazio), repetia o aviso do Ctrl+V em quatro lugares e renderizava as imagens
 * três vezes: galeria de anexadas, modal de ampliar e a pré-visualização que a
 * própria página já mostra ao lado.
 */
export default function ArticleContentEditor({
  value,
  onChange,
  label,
  placeholder = "Escreva em Markdown. Cole (Ctrl+V) ou arraste imagens para inseri-las aqui.",
  helpText,
  language = "pt",
  articleTitle = "artigo",
  required = false,
  rows = 12,
  focusLine,
}: ArticleContentEditorProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [isPicking, setIsPicking] = useState(false);
  const [images, setImages] = useState<StoredImage[]>([]);
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  /**
   * Ajusta a altura do campo ao conteúdo.
   *
   * Sem rolagem interna, o textarea não reserva espaço para a barra e as duas
   * camadas ficam com a mesma largura útil — condição para as linhas quebrarem
   * nos mesmos pontos. Também dispensa sincronizar posições de rolagem.
   */
  const fitHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Reajusta quando o texto muda por fora (troca de idioma, imagem inserida).
  useEffect(fitHeight, [value]);

  /**
   * Abre o campo na linha que estava sendo lida.
   *
   * Espera o texto chegar — em artigo carregado da nuvem, o primeiro render
   * vem vazio — e o quadro seguinte, para medir depois que `fitHeight` deu ao
   * campo a altura final. `atendido` garante uma única ida: passado o pulo, a
   * rolagem volta a ser de quem escreve.
   */
  const atendidoRef = useRef<number | null>(null);

  useEffect(() => {
    if (!focusLine || !value || atendidoRef.current === focusLine) return;

    const quadro = requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      atendidoRef.current = focusLine;
      scrollTextareaToLine(textarea, focusLine, highlightRef.current);
    });

    return () => cancelAnimationFrame(quadro);
  }, [focusLine, value]);

  const embedded = findEmbeddedImages(value);

  const loadImages = useCallback(async () => {
    try {
      setImages(await listImages());
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (isPicking) loadImages();
  }, [isPicking, loadImages]);

  /** Insere a marcação da imagem na posição do cursor. */
  const insertImage = (src: string, alt: string) => {
    const textarea = textareaRef.current;
    const current = value || "";
    const start = textarea ? textarea.selectionStart : current.length;
    const end = textarea ? textarea.selectionEnd : current.length;

    const tag = `\n\n![${alt}](${src})\n\n`;
    onChange(current.slice(0, start) + tag + current.slice(end));

    // Devolve o cursor para depois da imagem inserida.
    setTimeout(() => {
      if (!textarea) return;
      textarea.focus();
      const pos = start + tag.length;
      textarea.setSelectionRange(pos, pos);
    }, 50);
  };

  const uploadAndInsert = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus(language === "en" ? "Images only." : "Apenas arquivos de imagem.");
      return;
    }

    setIsBusy(true);
    setStatus("");

    try {
      const processed = await processImagePreservingFormat(file);
      const alt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      // Modo de teste: sem sessão o Storage recusaria; a imagem fica embutida.
      if (isDevPreview()) {
        insertImage(processed.dataUrl, alt);
        setIsPicking(false);
        return;
      }

      const name = `${slugify(articleTitle) || "img"}-${Date.now().toString().slice(-6)}.${processed.extension}`;
      const path = joinPath(GENERAL_FOLDER, name);

      await saveImage(path, processed.dataUrl, processed.size);
      insertImage(`db:${path}`, alt);
      setIsPicking(false);
    } catch (err) {
      setStatus(
        `${language === "en" ? "Upload failed" : "Falha ao enviar"}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file =
      Array.from(e.clipboardData?.files || []).find((f) => f.type.startsWith("image/")) ||
      Array.from(e.clipboardData?.items || [])
        .find((i) => i.type.startsWith("image"))
        ?.getAsFile();

    if (!file) return;
    e.preventDefault();
    uploadAndInsert(file);
  };

  const removeFromText = (fullMatch: string) => {
    onChange((value || "").replace(fullMatch, "").replace(/\n{3,}/g, "\n\n"));
  };

  const visibleImages = search
    ? images.filter((img) => img.name.toLowerCase().includes(search.toLowerCase()))
    : images;

  return (
    <div className="space-y-2 font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadAndInsert(file);
          e.target.value = "";
        }}
      />

      {/* Cabeçalho: rótulo (quando houver) e a única ação de imagem */}
      <div className="flex items-end justify-between gap-2">
        <div>
          {label && (
            <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {label} {required && "*"}
            </label>
          )}
          {helpText && <p className="text-[11px] text-slate-500">{helpText}</p>}
        </div>

        <button
          type="button"
          onClick={() => setIsPicking(true)}
          disabled={isBusy}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {language === "en" ? "Image" : "Imagem"}
        </button>
      </div>

      {/* Área de escrita. Arrastar e colar inserem imagens sem interface extra. */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) uploadAndInsert(file);
        }}
        className="relative"
      >
        <div
          className={`relative overflow-hidden rounded-xl border bg-white transition-colors focus-within:border-indigo-500 dark:bg-slate-900 ${
            isDragging ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200 dark:border-slate-800"
          }`}
        >
          <MarkdownHighlight ref={highlightRef} value={value} />

          {/* Texto transparente: o que se enxerga é a camada acima. O cursor e a
              seleção continuam sendo os nativos do textarea. */}
          <textarea
            ref={textareaRef}
            required={required}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            spellCheck={false}
            className={`relative block w-full resize-none overflow-hidden bg-transparent text-transparent caret-slate-800 placeholder:text-slate-500 focus:outline-hidden dark:caret-white ${EDITOR_TEXT_CLASS}`}
          />
        </div>

        <span className="pointer-events-none absolute bottom-2.5 right-3 font-mono text-[10px] text-slate-300 dark:text-slate-600">
          {value.length}
        </span>
      </div>

      {status && (
        <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{status}</p>
      )}

      {/* Imagens no texto: só o suficiente para removê-las. O conteúdo em si
          aparece na pré-visualização ao lado. */}
      {embedded.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {language === "en" ? "In text:" : "No texto:"}
          </span>
          {embedded.map((img, idx) => (
            <span
              key={idx}
              className="inline-flex max-w-[14rem] items-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-0.5 pl-2 pr-0.5 font-mono text-[10px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
            >
              <span className="truncate" title={img.src}>
                {img.src.startsWith("db:") ? fileNameOf(img.src.slice(3)) : img.alt || "imagem"}
              </span>
              <button
                type="button"
                onClick={() => removeFromText(img.fullMatch)}
                aria-label={language === "en" ? "Remove from text" : "Remover do texto"}
                className="rounded p-0.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Painel único: enviar nova ou escolher uma salva */}
      {isPicking && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={language === "en" ? "Insert image" : "Inserir imagem"}
        >
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                {language === "en" ? "Insert image" : "Inserir imagem"}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                  {language === "en" ? "Upload new" : "Enviar nova"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPicking(false)}
                  aria-label={language === "en" ? "Close" : "Fechar"}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* A busca só aparece quando a lista é grande o bastante para exigi-la. */}
            {images.length > 12 && (
              <div className="relative border-b border-slate-200 px-5 py-2.5 dark:border-slate-800">
                <Search className="absolute left-7 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={language === "en" ? "Search…" : "Buscar…"}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>
            )}

            <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3">
              {visibleImages.length === 0 && (
                <p className="col-span-full py-8 text-center text-xs text-slate-500">
                  {language === "en" ? "No saved images yet." : "Nenhuma imagem salva ainda."}
                </p>
              )}
              {visibleImages.map((img) => (
                <button
                  key={img.name}
                  type="button"
                  onClick={() => {
                    insertImage(`db:${img.name}`, fileNameOf(img.name).replace(/\.[^.]+$/, ""));
                    setIsPicking(false);
                  }}
                  className="overflow-hidden rounded-xl border-2 border-transparent text-left transition-all hover:border-indigo-400"
                >
                  <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                    <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <span className="block truncate px-1.5 py-1 font-mono text-[10px] text-slate-500">
                    {fileNameOf(img.name)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
