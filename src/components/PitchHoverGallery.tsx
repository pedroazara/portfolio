import React, { useEffect, useState } from "react";
import LocalImage from "./LocalImage";

interface PitchHoverGalleryProps {
  images: string[];
  children: React.ReactNode;
  className?: string;
}

/**
 * Envolve um card do elevator pitch: sem fotos cadastradas, só repassa os
 * filhos. Com fotos, passar o mouse abre um preview flutuante logo abaixo
 * do card, avançando sozinho entre as imagens enquanto o mouse ficar em
 * cima — pensado pra apresentação ao vivo, sem precisar clicar em nada.
 */
export default function PitchHoverGallery({ images, children, className }: PitchHoverGalleryProps) {
  const [hovered, setHovered] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!hovered || images.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), 1600);
    return () => clearInterval(timer);
  }, [hovered, images.length]);

  useEffect(() => {
    if (!hovered) setIndex(0);
  }, [hovered]);

  if (images.length === 0) return <>{children}</>;

  return (
    <div
      className={`relative ${className || ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}

      {hovered && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
            <LocalImage src={images[index]} alt="" className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-1 py-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === index ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
