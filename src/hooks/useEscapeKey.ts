import { useEffect } from "react";

/**
 * Fecha um modal com a tecla Escape.
 *
 * `active` deve ser o estado de abertura do modal: o ouvinte só existe
 * enquanto ele está aberto, e o `onClose` mais recente é sempre o usado.
 */
export function useEscapeKey(active: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!active) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onClose]);
}
