import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Trash2, Copy, Check, Image as ImageIcon, Sparkles, FileText, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StoredImage, listImages, saveImage, deleteImage } from "../utils/imageDb";
import ConfirmModal from "./ConfirmModal";

interface ImageBankModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageBankModal({ isOpen, onClose }: ImageBankModalProps) {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setConfirmOpen(true);
  };
  
  // New image states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen]);

  const loadImages = async () => {
    try {
      const stored = await listImages();
      setImages(stored);
    } catch (err) {
      console.error("Erro ao carregar banco de imagens:", err);
    }
  };

  const sanitizeSlug = (name: string): string => {
    // Standard slugification: replace spaces, special chars, keep file extension
    const parts = name.split(".");
    const ext = parts.pop() || "";
    const base = parts.join(".");
    
    const cleanBase = base
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9-_]/g, "-") // replace special chars with dash
      .replace(/-+/g, "-") // replace multiple dashes
      .replace(/^-|-$/g, ""); // trim dashes

    return `${cleanBase || "imagem"}.${ext.toLowerCase() || "png"}`;
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Por favor, selecione apenas arquivos de imagem (PNG, JPG, GIF, SVG, WEBP).");
      return;
    }

    setSelectedFile(file);
    setErrorMsg("");
    setCustomName(sanitizeSlug(file.name));

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !previewUrl || !customName.trim()) return;

    const finalName = customName.trim();

    // Check duplicate
    if (images.some((img) => img.name === finalName)) {
      setErrorMsg("Já existe uma imagem salva com este nome. Escolha um nome diferente.");
      return;
    }

    setIsSaving(true);
    try {
      await saveImage(finalName, previewUrl, selectedFile.size);
      await loadImages();
      
      // Reset states
      setSelectedFile(null);
      setPreviewUrl(null);
      setCustomName("");
      setErrorMsg("");
    } catch (err) {
      setErrorMsg("Falha ao salvar imagem no banco de dados local.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    triggerConfirm(
      "Excluir Imagem",
      `Tem certeza que deseja excluir permanentemente a imagem "${name}"?`,
      async () => {
        try {
          await deleteImage(name);
          await loadImages();
        } catch (err) {
          console.error("Erro ao deletar imagem:", err);
        }
      }
    );
  };

  const copyMarkdown = (name: string) => {
    const markdownCode = `![Legenda](db:${name})`;
    navigator.clipboard.writeText(markdownCode).then(() => {
      setCopiedName(name);
      setTimeout(() => setCopiedName(null), 2500);
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const filteredImages = images.filter((img) =>
    img.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs no-print">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Banco de Mídia & Imagens</h3>
              <p className="text-xs text-slate-500">Faça upload de fotos para ilustrar e usar em seus artigos de blog.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid gap-6 md:grid-cols-12 min-h-0">
          
          {/* Left Column: Upload Form */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Novo Upload</h4>
            
            <form onSubmit={handleSave} className="space-y-4">
              {/* Drag n Drop Stage */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  previewUrl
                    ? "border-emerald-500 bg-emerald-50/10"
                    : isDragging
                    ? "border-indigo-500 bg-indigo-50/30"
                    : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept="image/*"
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-3">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-36 rounded-xl mx-auto shadow-sm object-contain bg-slate-950/5 border border-slate-100"
                    />
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 rounded-full bg-emerald-50 px-2 py-0.5">
                      Pronto para salvar
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto h-10 w-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      Arraste uma imagem ou <span className="text-indigo-600 hover:underline">clique para buscar</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">PNG, JPG, GIF, SVG ou WEBP</p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                      Nome identificador do arquivo
                    </label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="nome-da-imagem.png"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden font-mono"
                    />
                    <p className="mt-1 text-[10px] text-slate-400 leading-normal">
                      Use este nome para referenciar a imagem no Markdown do blog. Ex: <code className="bg-slate-100 px-1 py-0.5 rounded">![Minha Imagem](db:{customName || "exemplo.png"})</code>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Tamanho: {formatSize(selectedFile.size)}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setCustomName("");
                        setErrorMsg("");
                      }}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? "Salvando..." : "Salvar no Banco"}
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium border border-rose-100 leading-relaxed">
                  {errorMsg}
                </div>
              )}
            </form>

            {/* Markdown Tutorial card */}
            <div className="mt-auto p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/60 text-indigo-950">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 font-display mb-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Como usar no Blog?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                1. Faça o upload da sua imagem aqui.<br />
                2. Clique em <span className="font-semibold text-indigo-700">Copiar Markdown</span> na lista ao lado.<br />
                3. Cole o código copiado em qualquer parte do texto ou artigo do seu blog!<br />
                4. A imagem será carregada automaticamente em tempo real.
              </p>
            </div>
          </div>

          {/* Right Column: Library List */}
          <div className="md:col-span-7 flex flex-col gap-4 min-h-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Sua Biblioteca ({images.length})</h4>
              
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar imagem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-full sm:w-48 text-xs rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {filteredImages.length === 0 ? (
              <div className="flex-1 border border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="p-3 rounded-xl bg-slate-50 text-slate-400 mb-2">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div className="text-xs font-semibold text-slate-700">Nenhuma imagem localizada</div>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1">
                  {searchTerm ? "Tente outro termo de busca ou limpe o filtro." : "Faça upload de fotos no formulário ao lado para compor sua biblioteca."}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[50vh] md:max-h-[60vh]">
                {filteredImages.map((img) => (
                  <div
                    key={img.name}
                    className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {/* Image Preview Thumb */}
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-slate-950/5 border border-slate-200/60 flex items-center justify-center shrink-0">
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="object-cover h-full w-full"
                        />
                      </div>
                      
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-slate-800 font-mono truncate" title={img.name}>
                          {img.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{formatSize(img.size)}</span>
                          <span>•</span>
                          <span>{new Date(img.addedAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-4">
                      {/* Copy code button */}
                      <button
                        onClick={() => copyMarkdown(img.name)}
                        className={`relative inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all border ${
                          copiedName === img.name
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                        }`}
                        title="Copiar código Markdown"
                      >
                        {copiedName === img.name ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
                            <span>Markdown</span>
                          </>
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(img.name)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Excluir Imagem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </motion.div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmCallback || (() => {})}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
