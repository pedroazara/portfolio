import { Language } from "./translations";

/**
 * Datas de currículo: mês e ano, nunca dia.
 *
 * As três seções do currículo — formação, pesquisa e atividades — mostravam o
 * período com a mesma regra escrita três vezes dentro do mesmo arquivo. Aqui
 * ela existe uma vez só, e o idioma entra por parâmetro em vez de vir do
 * escopo de um componente.
 */

const MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2024-03" vira "mar 2024"; só o ano fica como está. */
export function formatarData(dateStr: string | undefined, language: Language = "pt"): string {
  if (!dateStr) return "";
  if (dateStr.length === 4) return dateStr;

  const [ano, mes] = dateStr.split("-");
  const meses = language === "en" ? MESES_EN : MESES_PT;
  const indice = parseInt(mes, 10);

  if (mes && indice >= 1 && indice <= 12) return `${meses[indice - 1]} ${ano}`;
  return dateStr;
}

/** Período completo: "mar 2022 — Presente", ou só uma das pontas. */
export function formatarPeriodo(
  start?: string,
  end?: string,
  isCurrent?: boolean,
  language: Language = "pt"
): string {
  const inicio = formatarData(start, language);
  const fim = isCurrent ? (language === "en" ? "Present" : "Presente") : formatarData(end, language);

  if (!inicio && !fim) return "";
  if (!inicio) return fim;
  if (!fim) return inicio;
  return `${inicio} — ${fim}`;
}
