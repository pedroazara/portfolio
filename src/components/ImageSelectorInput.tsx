import React, { useState, useEffect, useRef } from "react";
import { Link, Image as ImageIcon, Check, RefreshCw, Search, X, Upload, Crop } from "lucide-react";
import { StoredImage, listImages, saveImage } from "../utils/imageDb";
import { optimizeImage, generateOgImage } from "../utils/imageOptimizer";
import ImageCropModal from "./ImageCropModal";
import LocalImage from "./LocalImage";

interface ImageSelectorInputProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  id?: string;
}

export default function ImageSelectorInput({
  label,
  value,
  onChange,
  placeholder = "https://images.unsplash.com/...",
  id,
}: ImageSelectorInputProps) {
  const [mode, setMode] = useState<"url" | "bank">(value.startsWith("db:") ? "bank" : "url");
  const [localImages, setLocalImages] = useState<StoredImage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync mode if value changes externally
  useEffect(() => {
    if (value.startsWith("db:")) {
      setMode("bank");
    }
  }, [value]);

  const loadLocalImages = async () => {
    setIsLoading(true);
    try {
      const list = await listImages();
      setLocalImages(list);
    } catch (err) {
      console.error("Erro ao carregar imagens locais:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "bank") {
      loadLocalImages();
    }
  }, [mode]);

  const processAndSaveFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatusMsg("Apenas arquivos de imagem são suportados.");
      return;
    }

    setIsUploading(true);
    setStatusMsg("Otimizando e processando imagem...");

    try {
      const optimized = await optimizeImage(file, 1600, 0.8);

      const cleanName = file.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9.-]/g, "-")
        .replace(/-+/g, "-");
      
      const baseName = cleanName.replace(/\.[^/.]+$/, "");
      const finalName = `${baseName || "img"}-${Date.now().toString().slice(-5)}.webp`;

      await saveImage(finalName, optimized.dataUrl, optimized.size);

      // Generate OG Image version (1200x630) if applicable
      try {
        const ogResult = await generateOgImage(file);
        const ogName = `og-${finalName}`;
        await saveImage(ogName, ogResult.dataUrl, ogResult.size);
      } catch (ogErr) {
        console.warn("Aviso ao gerar OG image:", ogErr);
      }

      await loadLocalImages();
      
      onChange(`db:${finalName}`);
      setMode("bank");
      setStatusMsg(`Imagem otimizada (${Math.round(optimized.size / 1024)}KB) e salva com sucesso!`);
      setTimeout(() => setStatusMsg(""), 3500);
    } catch (err) {
      console.error("Erro ao otimizar e salvar imagem:", err);
      setStatusMsg(`Erro ao salvar imagem: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndSaveFile(file);
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          processAndSaveFile(file);
        }
        break;
      }
    }
  };

  const selectedDbName = value.startsWith("db:") ? value.substring(3) : "";

  // Filter images by name
  const filteredImages = localImages.filter((img) =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-2" onPaste={handlePaste}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Label and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono" htmlFor={id}>
          {label}
        </label>
        
        {/* Toggle Mode */}
        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5" id={`${id || "image-selector"}-mode`}>
          <button
            type="button"
            onClick={() => {
              setMode("url");
              if (value.startsWith("db:")) {
                onChange("");
              }
            }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === "url"
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Link className="h-3 w-3" />
            <span>Link (URL)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("bank");
            }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === "bank"
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <ImageIcon className="h-3 w-3" />
            <span>Banco de Mídia</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all cursor-pointer"
            title="Upload ou cole do Clipboard (Ctrl+V)"
          >
            <Upload className="h-3 w-3" />
            <span>Upload / Ctrl+V</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 font-mono animate-pulse">
          {statusMsg}
        </div>
      )}

      {/* Input Fields */}
      {mode === "url" ? (
        <div className="relative">
          <input
            type="url"
            id={id}
            value={value.startsWith("db:") ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 pr-10 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden font-sans"
          />
          {value && !value.startsWith("db:") && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              <img src={value} className="h-full w-full object-cover" referrerPolicy="no-referrer" alt="preview" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {isLoading || isUploading ? (
            <div className="flex items-center justify-center py-4 text-xs font-mono text-slate-400 gap-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" />
              <span>{isUploading ? "Enviando e salvando imagem..." : "Buscando arquivos..."}</span>
            </div>
          ) : localImages.length === 0 ? (
            <div 
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer space-y-1.5 ${
                dragActive 
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30" 
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Upload className="mx-auto h-5 w-5 text-indigo-500" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-display">
                Nenhuma imagem no Banco. Clique ou solte um arquivo aqui!
              </p>
              <p className="text-[10px] text-slate-400 font-sans">
                Ou pressione <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[9px]">Ctrl+V</kbd> para colar direto do Clipboard.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Quick Upload Bar + Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Pesquisar por nome do arquivo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 pl-8 pr-8 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all shrink-0 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload</span>
                </button>
              </div>

              {/* Quick Paste hint dropzone */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`p-2 rounded-lg border border-dashed text-center text-[10px] transition-all ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                    : "border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50/50 dark:bg-slate-900/30"
                }`}
              >
                💡 Solte uma imagem aqui ou cole com <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[9px] text-slate-700 dark:text-slate-300">Ctrl+V</kbd> para enviar automaticamente ao Banco.
              </div>

              {/* Media Thumb Grid */}
              {filteredImages.length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center">
                  <p className="text-[11px] text-slate-500">Nenhuma imagem corresponde a "{searchQuery}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl">
                  {filteredImages.map((img) => {
                    const isSelected = selectedDbName === img.name;
                    return (
                      <button
                        key={img.name}
                        type="button"
                        onClick={() => onChange(`db:${img.name}`)}
                        className={`group relative flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/60 ring-1 ring-indigo-500"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="relative h-7 w-7 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0">
                          <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 truncate flex-1" title={img.name}>
                          {img.name}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 rounded-full bg-indigo-600 p-0.5 text-white">
                            <Check className="h-2 w-2" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Current Selection Feedback */}
              {value.startsWith("db:") && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-[10px] text-emerald-800 dark:text-emerald-300 font-mono">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="truncate">Selecionada: <strong>{selectedDbName}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange("")}
                    className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 font-bold hover:underline shrink-0 pl-2 cursor-pointer"
                  >
                    Desmarcar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Image Framing / Cover Crop Bar */}
      {value && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs mt-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-9 w-12 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
              <LocalImage src={value} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400 block">
                Capa Selecionada
              </span>
              <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate block">
                {value.startsWith("db:") ? value.substring(3) : value}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCropModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
            title="Ajustar enquadramento e proporção da imagem de capa"
          >
            <Crop className="h-3.5 w-3.5" />
            <span>Enquadrar Capa</span>
          </button>
        </div>
      )}

      {/* Image Crop Modal */}
      {isCropModalOpen && value && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageSrc={value}
          onSave={(croppedSrc) => {
            onChange(croppedSrc);
            loadLocalImages();
            setIsCropModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
