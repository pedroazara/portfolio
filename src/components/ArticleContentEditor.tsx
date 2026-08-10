import React, { useState, useRef, useEffect } from "react";
import { Upload, ImageIcon, Check, RefreshCw, Search, X, Clipboard, Sparkles, Eye, Code2, Columns, Trash2 } from "lucide-react";
import { StoredImage, listImages, saveImage } from "../utils/imageDb";
import { optimizeImage } from "../utils/imageOptimizer";
import { Language } from "../lib/translations";
import MarkdownRenderer from "./MarkdownRenderer";
import LocalImage from "./LocalImage";

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
}

type ViewMode = "split" | "edit" | "preview";

export default function ArticleContentEditor({
  value,
  onChange,
  label,
  placeholder = "Escreva o conteúdo do artigo...",
  helpText,
  language = "pt",
  articleTitle = "artigo",
  required = false,
  rows = 10,
}: ArticleContentEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showMediaBank, setShowMediaBank] = useState(false);
  const [mediaImages, setMediaImages] = useState<StoredImage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingBank, setIsLoadingBank] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadMediaBank = async () => {
    setIsLoadingBank(true);
    try {
      const list = await listImages();
      setMediaImages(list);
    } catch (err) {
      console.error("Erro ao carregar banco de mídia:", err);
    } finally {
      setIsLoadingBank(false);
    }
  };

  useEffect(() => {
    if (showMediaBank) {
      loadMediaBank();
    }
  }, [showMediaBank]);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const insertImageMarkdown = (imageName: string, altText = "Legenda da Imagem") => {
    const textarea = textareaRef.current;
    const currentVal = value || "";
    
    let start = currentVal.length;
    let end = currentVal.length;

    if (textarea) {
      start = textarea.selectionStart;
      end = textarea.selectionEnd;
    }

    const markdownTag = `\n\n![${altText}](db:${imageName})\n\n`;
    const newVal = currentVal.substring(0, start) + markdownTag + currentVal.substring(end);
    onChange(newVal);

    // Auto-scroll preview if present
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = start + markdownTag.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
      if (previewRef.current) {
        previewRef.current.scrollTop = previewRef.current.scrollHeight;
      }
    }, 100);
  };

  const processAndSaveFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showNotification(
        language === "en"
          ? "Please select image files only (PNG, JPG, WEBP, GIF, SVG)."
          : "Por favor, selecione apenas arquivos de imagem (PNG, JPG, WEBP, GIF, SVG)."
      );
      return;
    }

    setIsUploading(true);
    showNotification(
      language === "en" ? "Optimizing & uploading image..." : "Processando imagem e gerando preview ao vivo..."
    );

    try {
      const optimized = await optimizeImage(file, 1600, 0.8);

      const titleSlug = (articleTitle || "artigo")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 20);

      const timestamp = Date.now().toString().slice(-6);
      const finalName = `${titleSlug || "img"}-${timestamp}.webp`;

      await saveImage(finalName, optimized.dataUrl, optimized.size);
      
      const altText = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      insertImageMarkdown(finalName, altText);

      showNotification(
        language === "en"
          ? `✅ Image added & rendered in preview below! (${Math.round(optimized.size / 1024)}KB)`
          : `✅ Imagem inserida e renderizada no preview ao vivo! (${Math.round(optimized.size / 1024)}KB)`
      );

      if (showMediaBank) {
        loadMediaBank();
      }
    } catch (err) {
      console.error("Erro ao otimizar e salvar imagem:", err);
      showNotification(
        language === "en"
          ? `Failed to process image: ${err instanceof Error ? err.message : String(err)}`
          : `Falha ao processar imagem: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Check clipboard files first
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith("image/")) {
          e.preventDefault();
          processAndSaveFile(files[i]);
          return;
        }
      }
    }

    // Check clipboard items
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            processAndSaveFile(file);
            return;
          }
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndSaveFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndSaveFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Find all embedded images in the current markdown text
  const imageRegex = /!\[([^\]]*)\]\((db:[^)]+|https?:[^)]+)\)/g;
  const embeddedImages: { alt: string; src: string; fullMatch: string }[] = [];
  let match;
  while ((match = imageRegex.exec(value || "")) !== null) {
    embeddedImages.push({ alt: match[1], src: match[2], fullMatch: match[0] });
  }

  const handleRemoveImageFromText = (fullMatch: string) => {
    const updated = (value || "").replace(fullMatch, "").replace(/\n\n\n+/g, "\n\n");
    onChange(updated);
    showNotification(language === "en" ? "Image tag removed from text." : "Tag da imagem removida do texto.");
  };

  const filteredMediaImages = mediaImages.filter((img) =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Label and Toolbar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
            {label} {required && "*"}
          </label>
          {helpText && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">{helpText}</p>
          )}
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {/* View Mode Toggle Switch */}
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700 mr-1">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                viewMode === "split"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title={language === "en" ? "Split Editor + Live Preview" : "Editor + Preview Ao Vivo"}
            >
              <Columns className="h-3 w-3" />
              <span>{language === "en" ? "Split Live" : "Ao Vivo"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                viewMode === "edit"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title={language === "en" ? "Text Editor Only" : "Somente Editor de Texto"}
            >
              <Code2 className="h-3 w-3" />
              <span>{language === "en" ? "Editor" : "Texto"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                viewMode === "preview"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title={language === "en" ? "Live Rendered Article Preview" : "Somente Visualização do Artigo"}
            >
              <Eye className="h-3 w-3" />
              <span>{language === "en" ? "Preview" : "Visualizar"}</span>
            </button>
          </div>

          {/* Quick Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 px-2.5 py-1 text-[11px] font-bold shadow-xs transition-all cursor-pointer shrink-0"
            title={language === "en" ? "Upload and insert image" : "Colar ou anexar arquivo de imagem"}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{language === "en" ? "Colar/Anexar" : "Colar / Anexar Imagem"}</span>
          </button>

          {/* Toggle Media Bank Picker */}
          <button
            type="button"
            onClick={() => setShowMediaBank(!showMediaBank)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              showMediaBank
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{language === "en" ? "Media Bank" : "Banco"}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {toastMsg && (
        <div className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-semibold shadow-md flex items-center gap-2 animate-fadeIn">
          <Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Inline Media Bank Drawer */}
      {showMediaBank && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">
                {language === "en" ? "Select Image from Bank to Insert" : "Clique em uma imagem salva para inserir no texto"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowMediaBank(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isLoadingBank ? (
            <div className="flex items-center justify-center py-6 text-xs font-mono text-slate-400 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" />
              <span>Carregando mídia...</span>
            </div>
          ) : mediaImages.length === 0 ? (
            <div className="text-center py-6 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/60 space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {language === "en" ? "No images in Media Bank yet." : "Nenhuma imagem salva ainda. Cole uma imagem com Ctrl+V!"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === "en" ? "Search image by name..." : "Pesquisar por nome do arquivo..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 pl-8 pr-8 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                {filteredMediaImages.map((img) => (
                  <button
                    key={img.name}
                    type="button"
                    onClick={() => {
                      insertImageMarkdown(img.name);
                      showNotification(
                        language === "en"
                          ? `Inserted db:${img.name} into article!`
                          : `Inserida db:${img.name} no texto!`
                      );
                    }}
                    className="group relative flex flex-col items-center p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 transition-all cursor-pointer"
                  >
                    <div className="h-14 w-full rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden mb-1 flex items-center justify-center">
                      <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 truncate w-full text-center">
                      {img.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor & Preview Workspace Container */}
      <div className="grid grid-cols-1 gap-4">
        {/* TEXTAREA EDITOR (Visible in "edit" or "split") */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div 
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`relative rounded-2xl transition-all ${
              dragActive ? "ring-2 ring-indigo-500 bg-indigo-50/20" : ""
            }`}
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-t-2xl border-t border-x border-slate-200 dark:border-slate-800 text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-indigo-500" />
                <span>{language === "en" ? "Markdown Text Editor (Paste images with Ctrl+V)" : "Editor de Texto Markdown (Cole imagens com Ctrl+V)"}</span>
              </span>
              <span className="text-[10px] opacity-75">
                {value.length} {language === "en" ? "chars" : "caracteres"}
              </span>
            </div>

            <textarea
              ref={textareaRef}
              required={required}
              rows={viewMode === "split" ? 8 : rows}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={placeholder}
              className="w-full rounded-b-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-3 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden font-mono resize-y leading-relaxed"
            />

            {dragActive && (
              <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-indigo-500 bg-indigo-600/90 text-white flex flex-col items-center justify-center gap-2 backdrop-blur-xs z-10">
                <Upload className="h-8 w-8 animate-bounce" />
                <p className="text-sm font-bold font-display">
                  {language === "en" ? "Drop image here to auto-save and render!" : "Solte a imagem aqui para salvar e renderizar no texto!"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* LIVE RENDERED PREVIEW (Visible in "preview" or "split") */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
                  {language === "en" ? "Live Rendered Article Preview (Images Rendered Below)" : "Preview Ao Vivo do Artigo (Imagens Renderizadas)"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {language === "en" ? "Instant live rendering" : "Atualização instantânea"}
              </span>
            </div>

            <div 
              ref={previewRef}
              className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 max-h-[450px] overflow-y-auto pr-2"
            >
              {value.trim() ? (
                <MarkdownRenderer content={value} />
              ) : (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs italic font-sans">
                  {language === "en"
                    ? "Start typing or paste an image above to see the live rendered article..."
                    : "Comece a digitar ou cole uma imagem acima para ver o artigo renderizado ao vivo..."}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Embedded Images Quick Gallery Bar */}
      {embeddedImages.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold font-mono text-slate-600 dark:text-slate-400">
            <span>
              🖼️ {language === "en" ? `Images Embedded in Article (${embeddedImages.length})` : `Imagens Inseridas neste Artigo (${embeddedImages.length})`}
            </span>
            <span className="text-[10px] text-slate-400 font-sans font-normal">
              {language === "en" ? "Click to copy or remove" : "Clique para gerenciar"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {embeddedImages.map((img, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-1.5 text-xs group"
              >
                <div className="h-8 w-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                  <LocalImage src={img.src} alt={img.alt} className="h-full w-full object-cover" />
                </div>
                <div className="max-w-[120px] truncate font-mono text-[10px] text-slate-700 dark:text-slate-300">
                  {img.alt || img.src.replace("db:", "")}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveImageFromText(img.fullMatch)}
                  className="p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-1"
                  title={language === "en" ? "Remove image tag from text" : "Remover esta imagem do texto"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Instructions Hint */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono gap-1 pt-1">
        <span className="flex items-center gap-1">
          <Clipboard className="h-3 w-3 text-indigo-500" />
          <span>
            {language === "en" 
              ? "Tip: Copy any image or screenshot and press Ctrl+V directly into the editor!" 
              : "Dica: Copie qualquer imagem ou print da tela e pressione Ctrl+V no editor!"}
          </span>
        </span>
      </div>
    </div>
  );
}

