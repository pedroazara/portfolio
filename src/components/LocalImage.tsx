import React, { useEffect, useState } from "react";
import { FileText, ImageOff } from "lucide-react";
import { getImage, getSyncImage, isPdfRef } from "../utils/imageDb";

interface LocalImageProps extends React.ImgHTMLAttributes<HTMLImageElement> { fallback?: string }

export default function LocalImage(props: LocalImageProps) {
  return <ResolvedImage key={props.src} {...props} />;
}

function ResolvedImage({ src, fallback, className, onLoad, onError, ...props }: LocalImageProps) {
  const [resolved, setResolved] = useState(() => src?.startsWith("db:") ? getSyncImage(src.slice(3)) : src);
  const [originalOnly, setOriginalOnly] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!src?.startsWith("db:") || resolved || isPdfRef(src)) return;
    let cancelled = false;
    getImage(src.slice(3)).then(value => {
      if (cancelled) return;
      setResolved(value || fallback);
      if (!value && !fallback) setFailed(true);
    }).catch(() => {
      if (!cancelled) { setResolved(fallback); if (!fallback) setFailed(true); }
    });
    return () => { cancelled = true; };
  }, [src, fallback]);

  const responsive = !originalOnly && src?.startsWith("db:") && /\.(png|jpe?g|webp)$/i.test(src);
  const optimized = (width: number) => `/api/image?path=${encodeURIComponent(src!.slice(3))}&w=${width}`;
  if (src && isPdfRef(src)) return <span role="img" aria-label={props.alt || "PDF"} className={`flex items-center justify-center gap-2 bg-slate-100 text-slate-500 dark:bg-slate-800 ${className || "h-48 w-full"}`}><FileText aria-hidden className="h-5 w-5" />PDF</span>;
  if (failed || !src) return <span role="img" aria-label={props.alt || "Imagem indisponível"} className={`flex items-center justify-center bg-slate-100 text-slate-500 dark:bg-slate-800 ${className || "h-48 w-full"}`}><ImageOff aria-hidden className="h-6 w-6" /></span>;
  if (!resolved && !responsive) return <span aria-busy="true" aria-label={props.alt} className={`block animate-pulse bg-slate-100 dark:bg-slate-800 ${className || "h-48 w-full"}`} />;
  return <img
    src={responsive ? optimized(960) : resolved}
    srcSet={responsive ? [320, 640, 960, 1600].map(w => `${optimized(w)} ${w}w`).join(", ") : undefined}
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
    loading="lazy" decoding="async"
    {...props}
    className={`${className || ""} ${loaded ? "" : "bg-slate-100 dark:bg-slate-800"}`}
    onLoad={event => { setLoaded(true); onLoad?.(event); }}
    onError={event => {
      if (responsive) { setOriginalOnly(true); return; }
      if (fallback && resolved !== fallback) { setResolved(fallback); return; }
      setFailed(true); onError?.(event);
    }}
  />;
}
