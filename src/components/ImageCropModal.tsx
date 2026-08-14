import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Crop, ZoomIn, ZoomOut, RotateCw, Check, RefreshCw, 
  Move, Sliders, Layout, Sparkles, Image as ImageIcon, Upload, ImageDown
} from "lucide-react";
import { getImage, saveImage, listImages, StoredImage } from "../utils/imageDb";
import { Language } from "../lib/translations";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (croppedImageSrc: string) => void;
  language?: Language;
  title?: string;
}

type AspectRatioOption = {
  label: string;
  value: number; // width / height
  ratioText: string;
};

const ASPECT_RATIOS: AspectRatioOption[] = [
  { label: "Capa de Post (16:9)", value: 16 / 9, ratioText: "16:9" },
  { label: "Banner Largo (21:9)", value: 21 / 9, ratioText: "21:9" },
  { label: "Card Clássico (4:3)", value: 4 / 3, ratioText: "4:3" },
  { label: "Quadrado (1:1)", value: 1 / 1, ratioText: "1:1" },
];

export default function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  onSave,
  language = "pt",
  title,
}: ImageCropModalProps) {
  const [activeSrc, setActiveSrc] = useState<string>(imageSrc);
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Natural image dimensions
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 600, height: 337.5 });

  // Framing state
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Media bank drawer inside modal
  const [bankImages, setBankImages] = useState<StoredImage[]>([]);
  const [showBank, setShowBank] = useState<boolean>(false);

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Canvas & Image refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEn = language === "en";

  // Sync activeSrc when imageSrc prop changes
  useEffect(() => {
    setActiveSrc(imageSrc);
  }, [imageSrc]);

  // Load media bank list
  useEffect(() => {
    if (isOpen) {
      listImages().then((imgs) => setBankImages(imgs)).catch(console.error);
    }
  }, [isOpen]);

  // Measure viewport size
  const updateViewportSize = () => {
    if (viewportRef.current) {
      const w = viewportRef.current.clientWidth;
      const h = viewportRef.current.clientHeight;
      if (w > 0 && h > 0) {
        setViewportSize({ width: w, height: h });
      }
    }
  };

  useEffect(() => {
    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
    return () => window.removeEventListener("resize", updateViewportSize);
  }, [aspectRatio, isOpen]);

  // Load image data and get natural dimensions
  useEffect(() => {
    if (!isOpen || !activeSrc) return;

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });

    async function loadImage() {
      try {
        let srcToUse = activeSrc;
        if (activeSrc.startsWith("db:")) {
          const dbName = activeSrc.substring(3);
          const dataUrl = await getImage(dbName);
          if (dataUrl) {
            srcToUse = dataUrl;
          } else {
            throw new Error(isEn ? "Image not found in local database." : "Imagem não encontrada no banco local.");
          }
        }

        // Measure natural dimensions
        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error(isEn ? "Failed to load original image dimensions." : "Erro ao carregar dimensões da imagem."));
          img.src = srcToUse;
        });

        if (isMounted) {
          setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
          setResolvedUrl(srcToUse);
          setIsLoading(false);
          setTimeout(updateViewportSize, 50);
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeSrc, isEn]);

  // Compute base draw dimensions for full cover fitting
  const getRenderDimensions = () => {
    const vpW = viewportSize.width || 600;
    const vpH = viewportSize.height || (600 / aspectRatio);

    if (!naturalSize.width || !naturalSize.height) {
      return { width: vpW, height: vpH };
    }

    const imgRatio = naturalSize.width / naturalSize.height;
    const vpRatio = vpW / vpH;

    let renderW = vpW;
    let renderH = vpH;

    if (imgRatio > vpRatio) {
      // Image is wider than crop box: height matches crop box, width expands
      renderH = vpH;
      renderW = vpH * imgRatio;
    } else {
      // Image is taller than crop box: width matches crop box, height expands
      renderW = vpW;
      renderH = vpW / imgRatio;
    }

    return { width: renderW, height: renderH };
  };

  const renderDim = getRenderDimensions();

  // Drag / Pan logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Upload custom file directly in modal
  const handleFileUploadInModal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        const tempName = `temp-upload-${Date.now()}`;
        saveImage(tempName, dataUrl, dataUrl.length);
        setActiveSrc(`db:${tempName}`);
        setShowBank(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Crop & Export function
  const handleCropAndSave = async () => {
    if (!resolvedUrl || !viewportRef.current) return;

    setIsSaving(true);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error(isEn ? "Failed to render image for crop." : "Erro ao carregar imagem para recorte."));
        img.src = resolvedUrl;
      });

      // Measure exact viewport bounding rectangle
      const vpRect = viewportRef.current.getBoundingClientRect();
      const vpW = vpRect.width > 0 ? vpRect.width : (viewportSize.width || 600);
      const vpH = vpRect.height > 0 ? vpRect.height : (vpW / aspectRatio);

      // Target high quality resolution width
      const targetWidth = 1200;
      const targetHeight = Math.round(targetWidth / aspectRatio);

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Fill background
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Scale factor from screen viewport pixels to canvas pixels
      const scaleFactor = targetWidth / vpW;

      // Unscaled cover dimensions fitting viewport
      const imgRatio = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      const vpRatio = vpW / vpH;

      let baseRenderW = vpW;
      let baseRenderH = vpH;

      if (imgRatio > vpRatio) {
        baseRenderH = vpH;
        baseRenderW = vpH * imgRatio;
      } else {
        baseRenderW = vpW;
        baseRenderH = vpW / imgRatio;
      }

      ctx.save();

      // Translate origin to transformed image center on canvas:
      // Canvas center: (targetWidth / 2, targetHeight / 2)
      // Screen pan: (pan.x, pan.y) scaled by scaleFactor
      const canvasCenterX = targetWidth / 2 + pan.x * scaleFactor;
      const canvasCenterY = targetHeight / 2 + pan.y * scaleFactor;

      ctx.translate(canvasCenterX, canvasCenterY);

      // Apply rotation around the transformed center
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply zoom scale around the transformed center
      ctx.scale(zoom, zoom);

      // Draw image centered at (0, 0)
      const drawW = baseRenderW * scaleFactor;
      const drawH = baseRenderH * scaleFactor;

      ctx.drawImage(
        img,
        -drawW / 2,
        -drawH / 2,
        drawW,
        drawH
      );

      ctx.restore();

      // Export as WebP
      const dataUrl = canvas.toDataURL("image/webp", 0.90);
      const approxSize = Math.round((dataUrl.length * 3) / 4);

      // Envia para o banco de imagens
      const fileName = `cropped-cover-${Date.now()}.webp`;
      await saveImage(fileName, dataUrl, approxSize);

      onSave(`db:${fileName}`);
      onClose();
    } catch (err) {
      console.error("Erro ao enquadrar e salvar imagem:", err);
      alert(isEn ? "Failed to save cropped image." : `Erro ao salvar enquadramento: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUploadInModal}
          accept="image/*"
          className="hidden"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-950/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                <Crop className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  {title || (isEn ? "Frame & Crop Post Cover" : "Enquadrar Imagem de Capa")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                  {isEn ? "Drag photo to frame full original image." : "Clique e arraste para posicionar e enquadrar a foto original completa."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBank(!showBank)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  showBank
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{isEn ? "Change Source Photo" : "Trocar Imagem Original"}</span>
              </button>

              <button
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Source Selection Bank Drawer (if open) */}
          {showBank && (
            <div className="p-4 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-slate-600 dark:text-slate-300">
                  {isEn ? "Select original image from media bank or upload new file:" : "Selecione a imagem original no banco de mídia ou faça upload:"}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 text-white px-2.5 py-1 text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <Upload className="h-3 w-3" />
                  <span>{isEn ? "Upload New File" : "Upload Nova Imagem"}</span>
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {bankImages.map((img, idx) => (
                  <button
                    key={`crop-bank-${img.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      setActiveSrc(`db:${img.name}`);
                      setShowBank(false);
                    }}
                    className={`relative shrink-0 h-16 w-24 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      activeSrc === `db:${img.name}`
                        ? "border-indigo-600 ring-2 ring-indigo-500/50"
                        : "border-slate-300 dark:border-slate-700 hover:border-indigo-400"
                    }`}
                  >
                    <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[8px] font-mono text-white truncate px-1">
                      {img.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 font-mono text-xs">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                <span>{isEn ? "Loading original image..." : "Carregando imagem original em alta resolução..."}</span>
              </div>
            ) : loadError ? (
              <div className="p-6 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-center text-xs font-mono space-y-2">
                <p className="font-bold">{isEn ? "Unable to load image" : "Não foi possível carregar a imagem"}</p>
                <p className="opacity-80">{loadError}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Carregar Outra Imagem</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Area: Viewport + Interactive Canvas */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                      <Move className="h-3.5 w-3.5 text-indigo-500" />
                      {isEn ? "Interactive Crop Frame" : "Quadro de Enquadramento (Clique & Arraste)"}
                    </span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-[11px] font-bold"
                    >
                      {isEn ? "Center Image" : "Centralizar Foto"}
                    </button>
                  </div>

                  {/* Crop Viewport Box */}
                  <div 
                    ref={viewportRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ aspectRatio }}
                    className={`relative w-full overflow-hidden rounded-2xl bg-slate-950 border-2 border-indigo-500/60 shadow-xl select-none cursor-grab active:cursor-grabbing flex items-center justify-center ${
                      isDragging ? "ring-2 ring-indigo-500 ring-offset-2" : ""
                    }`}
                  >
                    {/* Grid Overlay for Composition (Rule of Thirds) */}
                    <div className="absolute inset-0 z-20 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                      <div className="border-r border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-r border-b border-white/15" />
                      <div className="border-b border-white/15" />
                      <div className="border-r border-white/15" />
                      <div className="border-r border-white/15" />
                      <div />
                    </div>

                    {/* Image Container with Full Natural Dimensions & Transforms */}
                    <div
                      className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                      }}
                    >
                      <img
                        src={resolvedUrl}
                        alt="Crop target"
                        style={{
                          width: `${renderDim.width}px`,
                          height: `${renderDim.height}px`,
                          maxWidth: "none",
                          maxHeight: "none",
                        }}
                        className="pointer-events-none select-none shrink-0"
                        draggable={false}
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Drag Helper Tag */}
                    <div className="absolute bottom-3 right-3 z-30 pointer-events-none rounded-lg bg-slate-900/85 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono text-white/90 border border-white/10 flex items-center gap-1.5 shadow-md">
                      <Move className="h-3 w-3 text-indigo-400" />
                      <span>{isEn ? "Drag to reposition" : "Arraste a foto para mover"}</span>
                    </div>
                  </div>

                  {/* Proportions Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 mr-1">
                      {isEn ? "Aspect Ratio:" : "Proporção:"}
                    </span>
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.ratioText}
                        type="button"
                        onClick={() => {
                          setAspectRatio(ratio.value);
                          setPan({ x: 0, y: 0 });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                          Math.abs(aspectRatio - ratio.value) < 0.01
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                        }`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Area: Adjustments & Live Feed Preview */}
                <div className="lg:col-span-4 space-y-5 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  
                  {/* Adjustment Controls */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                      {isEn ? "Framing Controls" : "Ajustes da Imagem"}
                    </h4>

                    {/* Zoom Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <ZoomIn className="h-3.5 w-3.5 text-indigo-500" />
                          Zoom
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {Math.round(zoom * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="3"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* Rotation Control */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <RotateCw className="h-3.5 w-3.5 text-indigo-500" />
                          {isEn ? "Rotation" : "Rotação"}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {rotation}°
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {[0, 90, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => setRotation(deg)}
                            className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                              rotation === deg
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Original Dimensions Info */}
                    {naturalSize.width > 0 && (
                      <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/50 text-[10.5px] font-mono text-indigo-700 dark:text-indigo-300">
                        <span>Original: <strong>{naturalSize.width} x {naturalSize.height}px</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Live Feed Card Simulation */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Layout className="h-3 w-3 text-indigo-500" />
                      {isEn ? "Live Feed Card Preview" : "Prévia de Capa no Feed"}
                    </span>

                    <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                      {/* Live Cropped Simulation */}
                      <div 
                        style={{ aspectRatio }} 
                        className="relative w-full overflow-hidden bg-slate-950 flex items-center justify-center"
                      >
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            transform: `translate(${pan.x * 0.4}px, ${pan.y * 0.4}px) scale(${zoom}) rotate(${rotation}deg)`,
                          }}
                        >
                          <img
                            src={resolvedUrl}
                            alt="Preview card"
                            style={{
                              width: `${renderDim.width * 0.4}px`,
                              height: `${renderDim.height * 0.4}px`,
                              maxWidth: "none",
                              maxHeight: "none",
                            }}
                            className="shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>

                      <div className="p-3 space-y-1">
                        <div className="h-2 w-12 rounded-full bg-indigo-500/20" />
                        <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-700 font-bold" />
                        <div className="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-5 py-4 bg-slate-50/80 dark:bg-slate-950/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isEn ? "Cancel" : "Cancelar"}
            </button>

            <button
              type="button"
              onClick={handleCropAndSave}
              disabled={isLoading || !!loadError || isSaving}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{isEn ? "Saving..." : "Processando Capa..."}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{isEn ? "Apply Enquadramento" : "Aplicar Enquadramento de Capa"}</span>
                </>
              )}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
