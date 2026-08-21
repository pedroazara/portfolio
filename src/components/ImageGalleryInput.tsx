import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, Loader2, X, Search } from "lucide-react";
import {
  StoredImage,
  listImages,
  saveImage,
  fileNameOf,
  joinPath,
  GENERAL_FOLDER,
} from "../utils/imageDb";
import { optimizeImage } from "../utils/imageOptimizer";
import { Language } from "../lib/translations";
import { isDevPreview } from "../lib/devPreview";
import LocalImage from "./LocalImage";

interface ImageGalleryInputProps {
  /** Referências das imagens da galeria, na ordem de exibição. */
  value: string[];
  onChange: (images: string[]) => void;
  /** Pasta de destino dos envios. Sem ela, vão para a pasta geral. */
  folder?: string;
  language?: Language;
}

/**
 * Galeria de imagens de um item.
 *
 * Junta o que antes eram duas telas concorrentes: uma gaveta que só escolhia
 * imagens já existentes e um painel separado que só enviava arquivos para a
 * pasta do projeto. Aqui as duas coisas acontecem no mesmo lugar — enviar uma
 * imagem já a coloca na galeria, que é o que se quer em quase todos os casos.
 */
export default function ImageGalleryInput({
  value,
  onChange,
  folder,
  language = "pt",
}: ImageGalleryInputProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [images, setImages] = useState<StoredImage[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const destination = folder || GENERAL_FOLDER;

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

  const add = (ref: string) => {
    if (value.includes(ref)) return;
    onChange([...value, ref]);
  };

  const upload = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setError(language === "en" ? "Images only." : "Apenas arquivos de imagem.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const added: string[] = [];

      for (const file of imageFiles) {
        const optimized = await optimizeImage(file, 1600, 0.8);

        // Modo de teste: sem sessão o Storage recusaria; fica embutida.
        if (isDevPreview()) {
          added.push(optimized.dataUrl);
          continue;
        }

        const base = file.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        const path = joinPath(
          destination,
          `${base || "imagem"}-${Date.now().toString().slice(-5)}.webp`
        );

        await saveImage(path, optimized.dataUrl, optimized.size);
        added.push(`db:${path}`);
      }

      onChange([...value, ...added.filter((ref) => !value.includes(ref))]);
      setIsPicking(false);
    } catch (err) {
      setError(
        `${language === "en" ? "Upload failed" : "Falha ao enviar"}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const visibleImages = search
    ? images.filter((img) => img.name.toLowerCase().includes(search.toLowerCase()))
    : images;

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) upload(files);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          upload(Array.from(e.dataTransfer.files));
        }}
        className={`rounded-xl border-2 border-dashed p-3 transition-colors ${
          isDragging
            ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        {value.length === 0 ? (
          <button
            type="button"
            onClick={() => setIsPicking(true)}
            disabled={isUploading}
            className="flex w-full flex-col items-center justify-center gap-1.5 py-6 text-center disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            ) : (
              <ImagePlus className="h-5 w-5 text-slate-300 dark:text-slate-600" />
            )}
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {language === "en" ? "Add gallery images" : "Adicionar imagens à galeria"}
            </span>
            <span className="text-[11px] text-slate-500">
              {language === "en" ? "Click or drag files here" : "Clique ou arraste arquivos aqui"}
            </span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {value.map((ref, idx) => (
              <div
                key={`${ref}-${idx}`}
                className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              >
                <LocalImage src={ref} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  aria-label={language === "en" ? "Remove from gallery" : "Remover da galeria"}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-white opacity-0 transition-all hover:bg-rose-600 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setIsPicking(true)}
              disabled={isUploading}
              className="flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-50 dark:border-slate-700"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              <span className="text-[10px] font-semibold">
                {language === "en" ? "Add" : "Adicionar"}
              </span>
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>}

      {/* Painel único: enviar novas ou escolher já salvas */}
      {isPicking && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={language === "en" ? "Add to gallery" : "Adicionar à galeria"}
        >
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  {language === "en" ? "Add to gallery" : "Adicionar à galeria"}
                </h2>
                <p className="font-mono text-[10px] text-slate-500">{destination}/</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                  {language === "en" ? "Upload" : "Enviar"}
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
              {visibleImages.map((img) => {
                const ref = `db:${img.name}`;
                const isSelected = value.includes(ref);
                return (
                  <button
                    key={img.name}
                    type="button"
                    onClick={() => (isSelected ? onChange(value.filter((v) => v !== ref)) : add(ref))}
                    className={`overflow-hidden rounded-xl border-2 text-left transition-all ${
                      isSelected ? "border-indigo-600" : "border-transparent hover:border-indigo-400"
                    }`}
                  >
                    <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                      <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </div>
                    <span className="block truncate px-1.5 py-1 font-mono text-[10px] text-slate-500">
                      {isSelected ? "✓ " : ""}
                      {fileNameOf(img.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
