import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Loader2, AlertCircle, Move } from "lucide-react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { getImage, saveImage, joinPath, coverPathFor, originalPathFor } from "../utils/imageDb";
import { Language } from "../lib/translations";
import { COVER_ASPECT, COVER_OUTPUT_WIDTH } from "../lib/coverAspect";
import { isDevPreview } from "../lib/devPreview";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Imagem a enquadrar: URL comum ou referência `db:caminho/arquivo`. */
  imageSrc: string;
  /**
   * Original explícito, quando o chamador o conhece e ele não pode ser deduzido
   * do caminho — é o caso do modo de teste, em que as imagens são embutidas e
   * não têm caminho no banco. Em uso normal a convenção de nomes basta.
   */
  originalSrc?: string;
  /** Recebe a referência `db:` da imagem recortada já salva no banco. */
  onSave: (croppedRef: string) => void;
  language?: Language;
}

/**
 * Enquadramento de capa.
 *
 * As capas do site são exibidas sempre em 16:9 (cartões, topo de artigo e de
 * projeto), então esta tela faz uma coisa só: escolher qual pedaço da imagem
 * ocupa esse quadro. Arrastar move, o controle deslizante aproxima, e pronto.
 *
 * A versão anterior oferecia quatro proporções, rotação, um banco de imagens
 * embutido, upload e um painel de pré-visualização separado — controles que
 * competiam entre si sem que nenhum resolvesse o caso comum.
 *
 * O recorte parte sempre da imagem **original**, nunca de um recorte anterior:
 * reenquadrar é uma decisão reversível, e a parte que ficou fora do quadro
 * continua disponível. O resultado vai sempre para o mesmo caminho derivado,
 * então reenquadrar substitui o recorte em vez de acumular arquivos.
 */

// A proporção vem de um só lugar: é a mesma que os cartões e as capas usam
// para exibir, o que faz o quadro daqui valer no site inteiro.
const ASPECT = COVER_ASPECT;
const OUTPUT_WIDTH = COVER_OUTPUT_WIDTH;

/**
 * Carrega a imagem pedindo CORS, para que o canvas aceite exportá-la.
 * Rejeita com uma mensagem legível quando a origem não permite.
 */
function loadForExport(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("a origem da imagem não permite o recorte (sem CORS)."));
    img.src = src;
  });
}

export default function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  originalSrc,
  onSave,
  language = "pt",
}: ImageCropModalProps) {
  useEscapeKey(isOpen, onClose);

  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Estado do enquadramento: escala e deslocamento em pixels do quadro.
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Dimensões reais da imagem e largura do quadro. Sem elas não dá para
  // desenhar a imagem transbordando o quadro na proporção certa.
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [frameWidth, setFrameWidth] = useState(0);

  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  // Resolve a referência `db:` para a URL pública antes de desenhar.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setStatus("loading");
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    const resolve = async () => {
      try {
        // Preferimos o original informado; senão, um `db:` que aponte para um
        // recorte é remontado para o caminho da imagem cheia.
        const base = originalSrc || imageSrc;
        const resolved = base.startsWith("db:")
          ? await getImage(originalPathFor(base.slice(3)))
          : base;

        if (cancelled) return;
        if (!resolved) {
          setStatus("error");
          setErrorMessage(language === "en" ? "Image not found." : "Imagem não encontrada.");
          return;
        }
        setUrl(resolved);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(language === "en" ? "Could not load the image." : "Não foi possível carregar a imagem.");
        }
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [isOpen, imageSrc, originalSrc, language]);

  // O quadro acompanha a largura do modal; remedimos quando ela muda.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !isOpen) return;

    const measure = () => setFrameWidth(el.getBoundingClientRect().width);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen, status]);

  // Arrastar para reposicionar, com ponteiro (funciona no mouse e no toque).
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  /**
   * Recorta no canvas reproduzindo exatamente o que a tela mostra.
   *
   * A imagem é exibida com `object-cover` num quadro 16:9, então o fator de
   * cobertura é o mesmo cálculo do CSS: a maior das razões entre as dimensões
   * do quadro e as da imagem. Multiplicado pelo zoom, dá a escala aplicada; o
   * deslocamento em pixels de tela vira deslocamento em pixels de origem
   * dividindo por essa escala.
   */
  const handleSave = useCallback(async () => {
    const frame = frameRef.current;
    const displayed = imageRef.current;
    if (!frame || !displayed || status !== "ready") return;

    setIsSaving(true);
    setErrorMessage("");
    try {
      // O canvas recusa exportar se a imagem veio de outra origem sem CORS —
      // e as imagens ficam no Storage do Supabase, que é outra origem. A
      // imagem exibida não pede CORS de propósito (assim ela aparece mesmo se
      // o cabeçalho faltar); para exportar, recarregamos com `crossOrigin`.
      // Vem do cache do navegador, então não há segundo download.
      const image = await loadForExport(url);

      const frameRect = frame.getBoundingClientRect();
      const coverScale = Math.max(
        frameRect.width / image.naturalWidth,
        frameRect.height / image.naturalHeight
      );

      const scale = coverScale * zoom;

      // Região da imagem original que aparece dentro do quadro.
      const sourceWidth = frameRect.width / scale;
      const sourceHeight = frameRect.height / scale;
      const sourceX = (image.naturalWidth - sourceWidth) / 2 - offset.x / scale;
      const sourceY = (image.naturalHeight - sourceHeight) / 2 - offset.y / scale;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = Math.round(OUTPUT_WIDTH / ASPECT);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível.");

      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        image,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, canvas.width, canvas.height
      );

      const dataUrl = canvas.toDataURL("image/webp", 0.85);

      // No modo de teste não há sessão, e o Storage recusaria a gravação.
      // Devolvemos a imagem embutida: o recorte fica visível na hora, sem sair
      // deste navegador. Em uso normal o fluxo segue para o banco de imagens.
      if (isDevPreview()) {
        onSave(dataUrl);
        return;
      }

      // Caminho derivado do original: reenquadrar substitui este arquivo em
      // vez de criar um novo a cada ajuste.
      const originalPath = imageSrc.startsWith("db:")
        ? originalPathFor(imageSrc.slice(3))
        : joinPath("geral", `capa-${Date.now().toString().slice(-6)}.png`);
      const path = coverPathFor(originalPath);

      await saveImage(path, dataUrl, dataUrl.length);
      onSave(`db:${path}`);
    } catch (err) {
      setErrorMessage(
        `${language === "en" ? "Could not save" : "Não foi possível salvar"}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsSaving(false);
    }
  }, [status, url, zoom, offset, imageSrc, onSave, language]);

  // Mesma fórmula usada na exportação: a escala que faz a imagem cobrir o
  // quadro, multiplicada pelo zoom. Manter as duas iguais é o que garante que
  // o recorte salvo seja exatamente o que está dentro do quadro.
  const frameHeight = frameWidth / ASPECT;
  const coverScale =
    natural.w && natural.h && frameWidth
      ? Math.max(frameWidth / natural.w, frameHeight / natural.h)
      : 0;
  const imageWidth = natural.w * coverScale * zoom;
  const imageHeight = natural.h * coverScale * zoom;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm no-print"
      role="dialog"
      aria-modal="true"
      aria-label={language === "en" ? "Frame cover" : "Enquadrar capa"}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            {language === "en" ? "Frame cover" : "Enquadrar capa"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label={language === "en" ? "Close" : "Fechar"}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="p-5">
          {status === "error" ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : (
            <>
              {/*
                Palco de enquadramento.

                A imagem é desenhada inteira e pode transbordar o quadro; o véu
                escurece o que fica de fora. Antes ela era cortada pelo próprio
                quadro, e não havia como ver o que estava sendo descartado.
              */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-slate-900 p-8 active:cursor-grabbing sm:p-10"
              >
                <div
                  ref={frameRef}
                  style={{ aspectRatio: String(ASPECT) }}
                  className="relative w-full"
                >
                  {status === "loading" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                    </div>
                  )}

                  {url && (
                    <img
                      ref={imageRef}
                      src={url}
                      alt=""
                      draggable={false}
                      referrerPolicy="no-referrer"
                      onLoad={(e) =>
                        setNatural({
                          w: e.currentTarget.naturalWidth,
                          h: e.currentTarget.naturalHeight,
                        })
                      }
                      style={{
                        width: imageWidth || undefined,
                        height: imageHeight || undefined,
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      }}
                      className="absolute left-1/2 top-1/2 max-w-none"
                    />
                  )}

                  {/* Véu: a sombra gigante escurece tudo fora do quadro. */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-white/70"
                    style={{ boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.7)" }}
                  />
                </div>
              </div>

              {/* Zoom — o único ajuste além de arrastar */}
              <div className="mt-4 flex items-center gap-3">
                <label
                  htmlFor="crop-zoom"
                  className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  {language === "en" ? "Zoom" : "Aproximar"}
                </label>
                <input
                  id="crop-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-700"
                />
                <span className="w-10 shrink-0 text-right font-mono text-[11px] text-slate-400">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {errorMessage && (
                <p className="mt-3 flex items-start gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="mt-px h-3 w-3 shrink-0" />
                  {errorMessage}
                </p>
              )}

              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Move className="h-3 w-3" />
                {language === "en"
                  ? "Drag the image to choose what stays in frame."
                  : "Arraste a imagem para escolher o que fica no quadro."}
              </p>
            </>
          )}
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {language === "en" ? "Cancel" : "Cancelar"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || status !== "ready"}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isSaving
              ? language === "en" ? "Saving…" : "Salvando…"
              : language === "en" ? "Use this frame" : "Usar este enquadramento"}
          </button>
        </div>
      </div>
    </div>
  );
}
