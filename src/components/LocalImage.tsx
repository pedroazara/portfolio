import React, { useState, useEffect } from "react";
import { getImage } from "../utils/imageDb";

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
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(undefined);
      setIsLoading(false);
      return;
    }

    if (src.startsWith("db:")) {
      setIsLoading(true);
      const dbKey = src.substring(3); // remove "db:" prefix
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

  return (
    <img
      src={resolvedSrc}
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
