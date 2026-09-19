import { AcademicActivity, Experience } from "../types";
import { Language } from "../lib/translations";

// Imagens fornecidas para estas duas pesquisas. O cadastro pode substituí-las.
const RESEARCH_IMAGES: Record<string, { src: string; alt: string; altEn: string }[]> = {
  "exp-1": [{ src: "/pitch/research/ic-bifenileno-poster.png", alt: "Apresentação do pôster sobre adsorção de metalocenos em bifenileno", altEn: "Poster presentation on metallocene adsorption on biphenylene" }],
  "exp-1786823937187": [
    { src: "/pitch/research/ic-dinamica-kmeans.png", alt: "Agrupamento K-means por raio de giração e RMSD", altEn: "K-means clustering by radius of gyration and RMSD" },
    { src: "/pitch/research/ic-dinamica-trajetoria.png", alt: "Estrutura molecular em uma trajetória alinhada", altEn: "Molecular structure in an aligned trajectory" },
    { src: "/pitch/research/ic-dinamica-ramachandran.png", alt: "Diagramas de Ramachandran coloridos por estado", altEn: "Ramachandran plots colored by state" },
  ],
};

export function imagensPesquisaPitch(experience: Experience, language: Language) {
  if (experience.galleryImages?.length) return experience.galleryImages.map((src, index) => ({ src, alt: `${language === "en" ? "Research image" : "Imagem da pesquisa"} ${index + 1}` }));
  return (RESEARCH_IMAGES[experience.id] || []).map(image => ({ src: image.src, alt: language === "en" ? image.altEn : image.alt }));
}

export function pesquisasPitch(experiences: Experience[]) {
  return [...experiences].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Extrai um trecho do cadastro, sem acrescentar atribuições ou resultados. */
export function resumoPitch(text: string, limit = 190): string {
  const plain = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[#*_`]/g, "").replace(/\s+/g, " ").trim();
  const sentence = plain.match(/^.+?[.!?](?:\s|$)/)?.[0]?.trim() || plain;
  if (sentence.length <= limit) return sentence;
  return `${sentence.slice(0, limit).replace(/\s+\S*$/, "")}…`;
}

export function periodoPitch(item: { startDate: string; endDate?: string; current?: boolean }, language: Language) {
  const format = (date: string) => /^\d{4}-\d{2}$/.test(date) ? `${date.slice(5)}/${date.slice(0, 4)}` : date;
  return [format(item.startDate), item.current ? (language === "en" ? "Present" : "Atual") : format(item.endDate || "")].filter(Boolean).join(" – ");
}

export function conteudoExperienciaPitch(experiences: Experience[], activities: AcademicActivity[], language: Language) {
  const principal = [...experiences].sort((a, b) => Number(!!b.current) - Number(!!a.current) || b.startDate.localeCompare(a.startDate))[0];
  const priority = (a: AcademicActivity) => /instrumenta|sensors|sensores|eletr[oô]nica/i.test(`${a.name} ${a.description}`) ? 0 : 1;
  const atividades = [...activities].sort((a, b) => priority(a) - priority(b));
  const competencias = language === "en"
    ? ["Embedded Systems", "Electronics", "Prototyping", "Python", "Computer Vision", "Robotics", "Project Management", "English", "3D Modeling", "Electronic Circuits"]
    : ["Sistemas Embarcados", "Eletrônica", "Prototipagem", "Python", "Visão Computacional", "Robótica", "Gestão de Projetos", "Inglês", "Modelagem 3D", "Circuitos Eletrônicos"];
  return { principal, atividades, competencias };
}
