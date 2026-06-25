import React, { useState, useEffect } from "react";
import { Link, Image as ImageIcon, Check, HelpCircle, RefreshCw, Search, X } from "lucide-react";
import { StoredImage, listImages } from "../utils/imageDb";
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

  // Sync mode if value changes externally
  useEffect(() => {
    if (value.startsWith("db:")) {
      setMode("bank");
    } else {
      setMode("url");
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

  const selectedDbName = value.startsWith("db:") ? value.substring(3) : "";

  // Filter images by name
  const filteredImages = localImages.filter((img) =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {/* Label and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono" htmlFor={id}>
          {label}
        </label>
        
        {/* Toggle Mode */}
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5" id={`${id || "image-selector"}-mode`}>
          <button
            type="button"
            onClick={() => {
              setMode("url");
              // If it was a DB reference, clear or let them edit URL
              if (value.startsWith("db:")) {
                onChange("");
              }
            }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === "url"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Link className="h-3 w-3" />
            <span>Link (URL)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("bank");
              // If it was not a DB reference, don't clear immediately, let them click one to override
            }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === "bank"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ImageIcon className="h-3 w-3" />
            <span>Banco de Mídia</span>
          </button>
        </div>
      </div>

      {/* Input Fields */}
      {mode === "url" ? (
        <div className="relative">
          <input
            type="url"
            id={id}
            value={value.startsWith("db:") ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
          />
          {value && !value.startsWith("db:") && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              <img src={value} className="h-full w-full object-cover" referrerPolicy="no-referrer" alt="preview" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 text-xs font-mono text-slate-400 gap-1.5 bg-slate-50 border border-slate-100 rounded-lg">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
              <span>Buscando arquivos...</span>
            </div>
          ) : localImages.length === 0 ? (
            <div className="p-3.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center space-y-1">
              <p className="text-[11px] font-medium text-slate-600">Nenhuma imagem no Banco de Mídia.</p>
              <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">
                Clique no botão <span className="font-bold text-indigo-600">"Banco de Imagens"</span> no topo do painel para enviar fotos antes.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar por nome do arquivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-xs text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden"
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

              {/* Media Thumb Grid */}
              {filteredImages.length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-center">
                  <p className="text-[11px] text-slate-500">Nenhuma imagem corresponde a "{searchQuery}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-100 rounded-xl">
                  {filteredImages.map((img) => {
                    const isSelected = selectedDbName === img.name;
                    return (
                      <button
                        key={img.name}
                        type="button"
                        onClick={() => onChange(`db:${img.name}`)}
                        className={`group relative flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="relative h-7 w-7 rounded bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-100 shrink-0">
                          <img src={img.dataUrl} alt={img.name} className="h-full w-full object-cover" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-700 truncate flex-1" title={img.name}>
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
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-[10px] text-emerald-800 font-mono">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="truncate">Selecionada: <strong>{selectedDbName}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange("")}
                    className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline shrink-0 pl-2"
                  >
                    Desmarcar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
