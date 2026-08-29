import React, { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { getImage, getSyncImage, isPdfRef } from "../utils/imageDb";

interface LocalImageProps {
  src?: string;
  fallback?: string;
  alt?: string;
  className?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  [key: string]: any;
}

export default function LocalImage({ src, fallback, ...props }: LocalImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(() => {
    if (src && src.startsWith("db:")) {
      const cached = getSyncImage(src.substring(3));
      if (cached) return cached;
    }
    return src && !src.startsWith("db:") ? src : undefined;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!src) return false;
    if (src.startsWith("db:")) {
      return !getSyncImage(src.substring(3));
    }
    return false;
  });

  useEffect(() => {
    if (!src) {
      setResolvedSrc(undefined);
      setIsLoading(false);
      return;
    }

    if (src.startsWith("db:")) {
      const dbKey = src.substring(3); // remove "db:" prefix
      const syncVal = getSyncImage(dbKey);
      if (syncVal) {
        setResolvedSrc(syncVal);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      getImage(dbKey)
        .then((dataUrl) => {
          if (dataUrl) {
            setResolvedSrc(dataUrl);
          } else {
            // Show custom elegant fallback placeholder
            setResolvedSrc(fallback || "https://images.unsplash.com/photo-1594322436404-5a0526db4d13?auto=format&fit=crop&w=400&q=80");
          }
        })
        .catch(() => {
          setResolvedSrc(fallback || "https://images.unsplash.com/photo-1594322436404-5a0526db4d13?auto=format&fit=crop&w=400&q=80");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setResolvedSrc(src);
      setIsLoading(false);
    }
  }, [src, fallback]);

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-slate-100 rounded-lg ${props.className || "w-full h-48"}`} />
    );
  }

  // Um PDF não abre dentro de uma tag <img> — mostramos um cartão com ícone
  // no lugar da miniatura que o navegador nunca conseguiria desenhar.
  if (src && isPdfRef(src)) {
    return (
      <div className={`flex items-center justify-center gap-1.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 ${props.className || "w-full h-48"}`}>
        <FileText className="h-5 w-5 shrink-0" />
        <span className="truncate text-xs font-semibold">PDF</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      // Padrões de desempenho: o navegador só baixa a imagem ao aproximá-la do
      // viewport e decodifica fora da thread principal. Props explícitas nos
      // usos individuais (ex.: a capa de um artigo) sobrescrevem os dois.
      loading="lazy"
      decoding="async"
      {...props}
      onError={(e) => {
        if (props.onError) props.onError(e);
        // Fallback on load error
        if (fallback && resolvedSrc !== fallback) {
          setResolvedSrc(fallback);
        }
      }}
    />
  );
}
