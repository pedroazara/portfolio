import React, { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Trash2, Copy, Check, Loader2, ImageIcon, AlertCircle, FolderOpen } from "lucide-react";
import { Language } from "../lib/translations";
import {
  StoredImage,
  listImages,
  saveImage,
  deleteImage,
  projectFolder,
  joinPath,
  fileNameOf,
} from "../utils/imageDb";
import { optimizeImage } from "../utils/imageOptimizer";
import ConfirmModal from "./ConfirmModal";

interface ProjectGalleryManagerProps {
  projectCodigo: string;
  language?: Language;
}

/** Nome de arquivo seguro para URL, preservando a extensão. */
function sanitizeFileName(name: string): string {
  const parts = name.split(".");
  const ext = (parts.length > 1 ? parts.pop() : "") || "webp";
  const base = parts.join(".")
    .toLowerCase()
    .normalize("NFD")
    // Remove marcas de acentuação separadas pelo NFD (combining diacritics).
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "imagem"}.${ext.toLowerCase()}`;
}

/**
 * Galeria de imagens de um projeto.
 *
 * Sobe direto para `projects/<codigo>/` no Storage, sem passar pelo banco
 * global. É isso que mantém a organização: o agrupamento acontece por onde
 * você subiu a imagem, não por como você lembrou de nomeá-la.
 */
export default function ProjectGalleryManager({ projectCodigo, language = "pt" }: ProjectGalleryManagerProps) {
  const folder = projectFolder(projectCodigo);

  const [images, setImages] = useState<StoredImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setImages(await listImages(folder));
      setError("");
    } catch (err) {
      setError(
        `${language === "en" ? "Could not list images" : "Não foi possível listar as imagens"}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  }, [folder, language]);

  useEffect(() => { load(); }, [load]);

  const uploadFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setError(language === "en" ? "Select image files only." : "Selecione apenas arquivos de imagem.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      for (const file of imageFiles) {
        const optimized = await optimizeImage(file, 1600, 0.8);
        const base = sanitizeFileName(file.name).replace(/\.[^.]+$/, "");
        const fileName = `${base}-${Date.now().toString().slice(-5)}.webp`;
        await saveImage(joinPath(folder, fileName), optimized.dataUrl, optimized.size);
      }
      await load();
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

  const handleDelete = async (path: string) => {
    try {
      await deleteImage(path);
      await load();
    } catch (err) {
      setError(
        `${language === "en" ? "Delete failed" : "Falha ao excluir"}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  const copyReference = (path: string) => {
    navigator.clipboard.writeText(`db:${path}`);
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <ImageIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              {language === "en" ? "Project gallery" : "Galeria do projeto"}
            </h2>
            <p className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
              <FolderOpen className="h-3 w-3" />
              {folder}/
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {isUploading
            ? language === "en" ? "Uploading…" : "Enviando…"
            : language === "en" ? "Add images" : "Adicionar imagens"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) uploadFiles(files);
          e.target.value = "";
        }}
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Área de arrastar e soltar */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          uploadFiles(Array.from(e.dataTransfer.files));
        }}
        className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${
          isDragging
            ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {language === "en" ? "Loading…" : "Carregando…"}
          </div>
        ) : images.length === 0 ? (
          <div className="py-10 text-center">
            <ImageIcon className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {language === "en" ? "No images yet" : "Nenhuma imagem ainda"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {language === "en"
                ? "Drag files here, or use the button above."
                : "Arraste arquivos aqui, ou use o botão acima."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <div
                key={img.name}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="aspect-video w-full overflow-hidden">
                  <img src={img.url} alt={fileNameOf(img.name)} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="p-2">
                  <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400" title={fileNameOf(img.name)}>
                    {fileNameOf(img.name)}
                  </p>
                  <p className="font-mono text-[10px] text-slate-400">{Math.round(img.size / 1024)} KB</p>
                </div>

                {/* Ações sobrepostas */}
                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => copyReference(img.name)}
                    title={language === "en" ? "Copy reference" : "Copiar referência"}
                    className="rounded-lg bg-slate-900/80 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-slate-950"
                  >
                    {copied === img.name ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmTarget(img.name)}
                    title={language === "en" ? "Delete" : "Excluir"}
                    className="rounded-lg bg-rose-600/90 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        {language === "en"
          ? "Copy a reference and paste it into the cover or gallery field. Images are optimized to WebP before upload."
          : "Copie a referência e cole no campo de capa ou galeria. As imagens são otimizadas para WebP antes do envio."}
      </p>

      <ConfirmModal
        isOpen={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) handleDelete(confirmTarget);
          setConfirmTarget(null);
        }}
        title={language === "en" ? "Delete image" : "Excluir imagem"}
        message={
          language === "en"
            ? `Permanently delete "${confirmTarget ? fileNameOf(confirmTarget) : ""}"? Content still referencing it will show the fallback image.`
            : `Excluir permanentemente "${confirmTarget ? fileNameOf(confirmTarget) : ""}"? O conteúdo que ainda referenciar essa imagem passará a mostrar a imagem de reserva.`
        }
        confirmText={language === "en" ? "Delete" : "Excluir"}
        cancelText={language === "en" ? "Cancel" : "Cancelar"}
        type="danger"
      />
    </div>
  );
}
