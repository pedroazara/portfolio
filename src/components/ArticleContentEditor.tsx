import React, { useState, useRef, useEffect } from "react";
import { Upload, ImageIcon, Check, RefreshCw, Search, X, Clipboard, Trash2, ZoomIn, Plus } from "lucide-react";
import { StoredImage, listImages, saveImage } from "../utils/imageDb";
import { processImagePreservingFormat } from "../utils/imageOptimizer";
import { Language } from "../lib/translations";
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

export default function ArticleContentEditor({
  value,
  onChange,
  label,
  placeholder = "Escreva o conteúdo do artigo... Cole imagens com Ctrl+V ou arraste arquivos para inserir no texto.",
  helpText,
  language = "pt",
  articleTitle = "artigo",
  required = false,
  rows = 12,
}: ArticleContentEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showMediaBank, setShowMediaBank] = useState(false);
  const [mediaImages, setMediaImages] = useState<StoredImage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingBank, setIsLoadingBank] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<{ src: string; alt: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const insertImageMarkdown = (imageSrc: string, altText = "Imagem do artigo") => {
    const textarea = textareaRef.current;
    const currentVal = value || "";
    
    let start = currentVal.length;
    let end = currentVal.length;

    if (textarea) {
      start = textarea.selectionStart;
      end = textarea.selectionEnd;
    }

    const markdownTag = `\n\n![${altText}](${imageSrc})\n\n`;
    const newVal = currentVal.substring(0, start) + markdownTag + currentVal.substring(end);
    onChange(newVal);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = start + markdownTag.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
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
      language === "en" ? "Processing & saving image..." : "Otimizando e salvando imagem..."
    );

    try {
      const processed = await processImagePreservingFormat(file);

      const titleSlug = (articleTitle || "artigo")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 20);

      const timestamp = Date.now().toString().slice(-6);
      const finalName = `${titleSlug || "img"}-${timestamp}.${processed.extension}`;

      // Save locally to IndexedDB, memory cache & cloud DB
      await saveImage(finalName, processed.dataUrl, processed.size);
      
      const altText = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      // Insert internal db: reference into markdown text
      insertImageMarkdown(`db:${finalName}`, altText);

      showNotification(
        language === "en"
          ? `✅ Image attached & referenced as db:${finalName}! (${Math.round(processed.size / 1024)}KB)`
          : `✅ Imagem salva e referenciada como db:${finalName}! (${Math.round(processed.size / 1024)}KB)`
      );

      if (showMediaBank) {
        loadMediaBank();
      }
    } catch (err) {
      console.error("Erro ao otimizar e salvar imagem:", err);
      // Fallback: insert as raw dataUrl if DB fails so user work is never lost
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            insertImageMarkdown(e.target.result as string, file.name);
            showNotification(
              language === "en" ? "✅ Image inserted into article!" : "✅ Imagem inserida no texto do artigo!"
            );
          }
        };
        reader.readAsDataURL(file);
      } catch (fallbackErr) {
        showNotification(
          language === "en"
            ? "Failed to process image file."
            : "Falha ao carregar arquivo de imagem."
        );
      }
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

    // Check clipboard items (e.g. screenshots / copied canvas)
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
  const imageRegex = /!\[([^\]]*)\]\((db:[^)]+|https?:[^)]+|data:image[^)]+)\)/g;
  const embeddedImages: { alt: string; src: string; fullMatch: string }[] = [];
  let match;
  while ((match = imageRegex.exec(value || "")) !== null) {
    embeddedImages.push({ alt: match[1], src: match[2], fullMatch: match[0] });
  }

  const handleRemoveImageFromText = (fullMatch: string) => {
    const updated = (value || "").replace(fullMatch, "").replace(/\n\n\n+/g, "\n\n");
    onChange(updated);
    showNotification(language === "en" ? "Image removed from text." : "Imagem removida do texto.");
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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
            {label} {required && "*"}
          </label>
          {helpText && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">{helpText}</p>
          )}
        </div>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
            title={language === "en" ? "Upload or choose image file" : "Selecionar arquivo de imagem do computador"}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{language === "en" ? "Upload Image" : "Enviar Imagem"}</span>
          </button>

          {/* Toggle Media Bank Picker */}
          <button
            type="button"
            onClick={() => setShowMediaBank(!showMediaBank)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              showMediaBank
                ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>{language === "en" ? "Media Bank" : "Banco de Imagens"}</span>
          </button>

          {/* Ctrl+V Paste Indicator */}
          <div 
            className="hidden sm:inline-flex items-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80"
            title={language === "en" ? "Paste images with Ctrl+V directly into editor" : "Cole imagens diretamente no editor com Ctrl+V"}
          >
            <Clipboard className="h-3 w-3 text-indigo-500" />
            <span>Cole com Ctrl+V</span>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {toastMsg && (
        <div className="p-2.5 bg-indigo-900 text-white text-xs font-medium rounded-xl flex items-center justify-between animate-fadeIn shadow-md">
          <span>{toastMsg}</span>
          <button type="button" onClick={() => setToastMsg("")} className="text-indigo-200 hover:text-white p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Media Bank Panel */}
      {showMediaBank && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">
                {language === "en" ? "Select Saved Image to Insert into Text" : "Clique em uma imagem salva para inserir no artigo"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => loadMediaBank()}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors cursor-pointer"
              title="Atualizar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingBank ? "animate-spin" : ""}`} />
            </button>
          </div>

          {isLoadingBank ? (
            <div className="py-6 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
              <span>{language === "en" ? "Loading image bank..." : "Buscando imagens salvas..."}</span>
            </div>
          ) : mediaImages.length === 0 ? (
            <div className="text-center py-6 bg-white dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-medium text-slate-500">
                {language === "en" ? "No saved images in bank yet." : "Nenhuma imagem salva no banco ainda. Cole uma imagem com Ctrl+V ou envie um arquivo!"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === "en" ? "Search image name..." : "Buscar nome da imagem..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 pl-8 pr-8 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                {filteredMediaImages.map((img) => (
                  <button
                    key={img.name}
                    type="button"
                    onClick={() => {
                      insertImageMarkdown(`db:${img.name}`, img.name);
                      showNotification(
                        language === "en"
                          ? `Inserted db:${img.name} into text!`
                          : `Inserida db:${img.name} no texto!`
                      );
                    }}
                    className="group relative flex flex-col items-center p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-500 transition-all cursor-pointer"
                  >
                    <div className="h-16 w-full rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden mb-1 flex items-center justify-center">
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

      {/* Main Textarea Editor Dropzone */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl transition-all ${
          dragActive ? "ring-2 ring-indigo-500 bg-indigo-50/20" : ""
        }`}
      >
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-t-2xl border-t border-x border-slate-200 dark:border-slate-800 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Clipboard className="h-3.5 w-3.5 text-indigo-500" />
            <span>{language === "en" ? "Text Content Editor (Paste images directly with Ctrl+V)" : "Editor de Texto do Artigo (Cole imagens direto com Ctrl+V)"}</span>
          </span>
          <span className="text-[10px] text-slate-400 font-sans">
            {value.length} {language === "en" ? "chars" : "caracteres"}
          </span>
        </div>

        <textarea
          ref={textareaRef}
          required={required}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="w-full rounded-b-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden font-mono resize-y leading-relaxed"
        />

        {dragActive && (
          <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-indigo-500 bg-indigo-600/90 text-white flex flex-col items-center justify-center gap-2 backdrop-blur-xs z-10">
            <Upload className="h-8 w-8 animate-bounce" />
            <p className="text-sm font-bold font-display">
              {language === "en" ? "Drop image here to insert into text!" : "Solte a imagem aqui para anexar e exibir no editor!"}
            </p>
          </div>
        )}
      </div>

      {/* Rendered Attached Images Block Directly inside Editor */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
              {language === "en"
                ? `Attached Article Images (${embeddedImages.length})`
                : `Imagens Anexadas neste Artigo (${embeddedImages.length})`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {language === "en" ? "Rendered visually inside editor" : "Exibidas visualmente aqui"}
          </span>
        </div>

        {embeddedImages.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex justify-center text-slate-300 dark:text-slate-700">
              <Upload className="h-8 w-8" />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 font-sans max-w-md mx-auto">
              {language === "en"
                ? "No images added yet. Click 'Upload Image', paste a screenshot with Ctrl+V, or drag an image into the editor box above!"
                : "Nenhuma imagem adicionada ainda. Clique em 'Enviar Imagem', cole um print da tela com Ctrl+V ou arraste uma imagem para o texto acima!"}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{language === "en" ? "Attach First Image" : "Anexar Imagem Agora"}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {embeddedImages.map((img, idx) => (
              <div
                key={idx}
                className="group relative flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:border-indigo-500 transition-all"
              >
                {/* Visual Image Preview */}
                <div 
                  onClick={() => setPreviewImageModal({ src: img.src, alt: img.alt })}
                  className="relative h-36 w-full bg-slate-100 dark:bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center border-b border-slate-100 dark:border-slate-800"
                >
                  <LocalImage
                    src={img.src}
                    alt={img.alt || `Imagem ${idx + 1}`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-xs">
                      <ZoomIn className="h-3 w-3" />
                      <span>Ampliar</span>
                    </span>
                  </div>
                </div>

                {/* Footer details & remove button */}
                <div className="p-2.5 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-sans">
                      {img.alt || "Imagem"}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">
                      {img.src.startsWith("db:") ? img.src : "Link Externo / Base64"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveImageFromText(img.fullMatch)}
                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer shrink-0"
                    title={language === "en" ? "Remove image from text" : "Remover esta imagem do texto"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Enlarged Image View */}
      {previewImageModal && (
        <div 
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
        >
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden p-2 border border-slate-800 shadow-2xl">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute right-4 top-4 z-10 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="max-h-[80vh] flex items-center justify-center overflow-hidden rounded-xl">
              <LocalImage src={previewImageModal.src} alt={previewImageModal.alt} className="max-h-[75vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
