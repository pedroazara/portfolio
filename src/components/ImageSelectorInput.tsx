import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Crop, Trash2, Loader2, Link as LinkIcon, X } from "lucide-react";
import { StoredImage, listImages, saveImage, fileNameOf, joinPath, GENERAL_FOLDER } from "../utils/imageDb";
import { optimizeImage } from "../utils/imageOptimizer";
import ImageCropModal from "./ImageCropModal";
import LocalImage from "./LocalImage";
import { isDevPreview } from "../lib/devPreview";

interface ImageSelectorInputProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  id?: string;
}

/**
 * Seletor de imagem de capa.
 *
 * Um caminho principal: a imagem atual em destaque e três ações diretas —
 * trocar, enquadrar, remover. Sem imagem, um alvo único que aceita clique,
 * arrastar e colar.
 *
 * A versão anterior tinha abas "Link (URL)" e "Banco de Mídia" competindo com
 * um botão de upload, campo de busca sempre visível, e cada envio gravava duas
 * cópias (a imagem e uma variante `og-`). O link continua disponível, mas
 * recolhido: é o caso raro.
 */
export default function ImageSelectorInput({
  label,
  value,
  onChange,
  placeholder = "https://…",
  id,
}: ImageSelectorInputProps) {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    try {
      setImages(await listImages());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (isPicking) loadImages();
  }, [isPicking, loadImages]);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const optimized = await optimizeImage(file, 1600, 0.8);

      // Modo de teste: sem sessão o Storage recusaria o envio, então a imagem
      // fica embutida e visível só neste navegador.
      if (isDevPreview()) {
        onChange(optimized.dataUrl);
        setIsPicking(false);
        return;
      }

      const base = file.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const path = joinPath(
        GENERAL_FOLDER,
        `${base || "imagem"}-${Date.now().toString().slice(-5)}.webp`
      );

      await saveImage(path, optimized.dataUrl, optimized.size);
      onChange(`db:${path}`);
      setIsPicking(false);
    } catch (err) {
      setError(`Falha ao enviar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image"));
    if (!item) return;
    e.preventDefault();
    const file = item.getAsFile();
    if (file) upload(file);
  };

  const acaoClass =
    "flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <div className="space-y-2" onPaste={handlePaste}>
      {label && (
        <label htmlFor={id} className="block font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="space-y-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
            <LocalImage src={value} alt="" className="h-full w-full object-cover" />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => setIsPicking(true)} disabled={isUploading} className={acaoClass}>
              <ImagePlus className="h-3.5 w-3.5" />
              Trocar
            </button>
            <button type="button" onClick={() => setIsCropping(true)} disabled={isUploading} className={acaoClass}>
              <Crop className="h-3.5 w-3.5" />
              Enquadrar
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={isUploading}
              className={`${acaoClass} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </button>
            <span className="ml-auto truncate font-mono text-[10px] text-slate-400" title={value}>
              {value.startsWith("db:") ? fileNameOf(value.slice(3)) : "link externo"}
            </span>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) upload(file);
            }}
            disabled={isUploading}
            className={`flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition-colors ${
              isDragging
                ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                <span className="text-xs font-semibold text-slate-500">Enviando…</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Clique, arraste ou cole uma imagem
                </span>
                <span className="text-[11px] text-slate-400">Otimizada para WebP automaticamente</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 text-[11px]">
            <button
              type="button"
              onClick={() => setIsPicking(true)}
              className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Escolher do banco
            </button>
            <button
              type="button"
              onClick={() => setShowUrlField((v) => !v)}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <LinkIcon className="h-3 w-3" />
              usar link
            </button>
          </div>

          {showUrlField && (
            <input
              id={id}
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          )}
        </>
      )}

      {error && <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>}

      {/* Escolha no banco */}
      {isPicking && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">Escolher imagem</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700"
                >
                  Enviar nova
                </button>
                <button
                  type="button"
                  onClick={() => setIsPicking(false)}
                  aria-label="Fechar"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3">
              {images.length === 0 && (
                <p className="col-span-full py-8 text-center text-xs text-slate-400">
                  Nenhuma imagem no banco ainda.
                </p>
              )}
              {images.map((img) => (
                <button
                  key={img.name}
                  type="button"
                  onClick={() => {
                    onChange(`db:${img.name}`);
                    setIsPicking(false);
                  }}
                  className={`overflow-hidden rounded-xl border-2 text-left transition-all hover:border-indigo-400 ${
                    value === `db:${img.name}` ? "border-indigo-600" : "border-transparent"
                  }`}
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

      {isCropping && value && (
        <ImageCropModal
          isOpen={isCropping}
          onClose={() => setIsCropping(false)}
          imageSrc={value}
          onSave={(ref) => {
            onChange(ref);
            setIsCropping(false);
          }}
        />
      )}
    </div>
  );
}
