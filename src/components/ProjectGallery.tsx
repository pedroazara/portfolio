import { useEffect, useRef, useState } from "react";
import LocalImage from "./LocalImage";

/** Native modal dialog supplies focus containment, Escape and return focus. */
export default function ProjectGallery({ images, title, language, captions = {} }: { images: string[]; title: string; language: "pt" | "en"; captions?: Record<string, string> }) {
  const [index, setIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const en = language === "en";
  useEffect(() => {
    if (index === null) return;
    const modal = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    modal.showModal(); document.body.style.overflow = "hidden";
    return () => { modal.close(); document.body.style.overflow = previousOverflow; };
  }, [index === null]);
  const move = (delta: number) => { setIndex(current => current === null ? null : (current + delta + images.length) % images.length); setZoom(1); };
  const button = "min-h-11 min-w-11 rounded-lg border border-white/30 px-3 text-sm text-white hover:bg-white/15";
  return <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {images.map((src, i) => <button key={`${src}-${i}`} type="button" onClick={() => { setIndex(i); setZoom(1); }} aria-label={`${en ? "Open image" : "Abrir imagem"} ${i + 1}`} className="aspect-video overflow-hidden rounded-2xl border border-borda bg-superficie-alta cursor-zoom-in">
        <LocalImage src={src} alt={`${title} — ${i + 1}`} className="h-full w-full object-contain" />
      </button>)}
    </div>
    <dialog ref={dialog} aria-label={en ? "Image gallery" : "Galeria de imagens"} onCancel={() => setIndex(null)} onClose={() => setIndex(null)} onKeyDown={e => {
      if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    }} className="fixed inset-0 m-auto h-[100dvh] max-h-none w-screen max-w-none bg-slate-950 p-3 text-white backdrop:bg-black/80 sm:p-6">
      {index !== null && <div className="flex h-full min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="min-w-0 flex-1 truncate">{title} — {index + 1}/{images.length}</p>
          <button className={button} onClick={() => setZoom(z => z === 1 ? 2 : 1)}>{zoom === 1 ? (en ? "Zoom in" : "Ampliar") : (en ? "Fit image" : "Ajustar imagem")}</button>
          <button autoFocus className={button} onClick={() => setIndex(null)}>{en ? "Close gallery" : "Fechar galeria"}</button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto" onTouchStart={e => { touch.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }} onTouchEnd={e => {
          if (zoom !== 1 || !touch.current || !e.changedTouches[0]) return;
          const dx = e.changedTouches[0].clientX - touch.current.x; const dy = e.changedTouches[0].clientY - touch.current.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
          touch.current = null;
        }}>
          <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} className="flex items-center justify-center">
            <LocalImage key={images[index]} src={images[index]} alt={captions[images[index]] || `${title} — ${index + 1}`} loading="eager" sizes="100vw" className="h-full w-full object-contain" />
          </div>
        </div>
        {captions[images[index]] && <p className="max-h-24 overflow-auto text-center text-sm" aria-live="polite">{captions[images[index]]}</p>}
        <div className="flex items-center justify-between gap-3">
          <button className={button} disabled={images.length < 2} onClick={() => move(-1)}>{en ? "Previous" : "Anterior"}</button>
          <p className="text-center text-xs text-slate-300">{en ? "Arrow keys or swipe · Escape to close" : "Setas ou deslize · Esc para fechar"}</p>
          <button className={button} disabled={images.length < 2} onClick={() => move(1)}>{en ? "Next" : "Próxima"}</button>
        </div>
      </div>}
    </dialog>
  </>;
}
