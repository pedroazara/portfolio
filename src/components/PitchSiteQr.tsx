import { useEffect, useState } from "react";
import { Language } from "../lib/translations";

interface PitchSiteQrProps {
  url: string;
  language?: Language;
}

/**
 * QR code do site com o link por baixo — quem está assistindo pode escanear
 * e visitar o portfólio na hora, sem precisar anotar um endereço. Mesmo
 * pacote `qrcode` usado no PDF do currículo, carregado sob demanda para não
 * pesar no resto da apresentação.
 *
 * Só o cartão em si: quando e como ele aparece na tela é decidido por quem
 * o usa (ver `PitchMotivacaoSlide`, que o revela ao fim da rolagem).
 */
export default function PitchSiteQr({ url, language = "pt" }: PitchSiteQrProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const isEn = language === "en";
  const rotulo = url.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  useEffect(() => {
    let cancelado = false;
    import("qrcode")
      .then((mod) =>
        mod.default.toDataURL(url, {
          margin: 0,
          width: 240,
          color: { dark: "#0f172a", light: "#ffffff" },
        })
      )
      .then((dataUrl) => {
        if (!cancelado) setQrDataUrl(dataUrl);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [url]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-8 py-6 shadow-lg dark:bg-slate-900/95">
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt={isEn ? "QR code to the site" : "QR code do site"}
          className="h-28 w-28 rounded-lg sm:h-32 sm:w-32"
        />
      ) : (
        <div className="h-28 w-28 animate-pulse rounded-lg bg-slate-200 sm:h-32 sm:w-32 dark:bg-slate-700" />
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-indigo-600 dark:text-slate-300 dark:decoration-slate-600 dark:hover:text-indigo-400"
      >
        {rotulo}
      </a>
    </div>
  );
}
