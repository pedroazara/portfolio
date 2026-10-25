import { Language } from "../lib/translations";

/** "2026-09-08" vira "8 de set. de 2026"; qualquer outro formato passa como veio. */
export function formatPostDate(data: string, language: Language, month: "short" | "long" = "short") {
  const instante = new Date(`${data}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(instante.getTime())) return data;
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "pt-BR", {
    day: "numeric",
    month,
    year: "numeric",
    timeZone: "UTC",
  }).format(instante);
}
