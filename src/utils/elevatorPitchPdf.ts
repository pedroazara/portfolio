import { ResumeData } from "../types";
import { Language } from "../lib/translations";
import { PitchDraft, agruparPorCategoria } from "./elevatorPitch";
import { INK_BODY, INK_META, INK_TITLE, INDIGO_ACCENT, INDIGO_HEADING, loadJsPDF } from "./pdfGenerator";

/**
 * PDF do elevator pitch: uma página por slide, paisagem, para imprimir ou
 * levar de referência para a entrevista.
 *
 * Sem imagens de capa — as imagens dos projetos vêm do armazenamento do
 * Supabase como URL remota, e embuti-las exigiria buscar, decodificar e
 * contornar CORS por projeto, um caminho frágil para um documento que é só
 * texto de apoio. O mesmo motivo pelo qual o PDF do currículo já é só
 * tipografia — este segue a mesma regra.
 */
export async function gerarElevatorPitchPDF(
  draft: PitchDraft,
  data: ResumeData,
  language: Language
): Promise<void> {
  const isEn = language === "en";
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const PAGE_WIDTH = 297;
  const PAGE_HEIGHT = 210;
  const MARGIN = 18;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  const rodape = (pagina: number, total: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK_META);
    doc.text(`Elevator Pitch — ${data.profile.name}`, MARGIN, PAGE_HEIGHT - 10);
    doc.text(`${pagina} / ${total}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: "right" });
  };

  const abrirPagina = (indice: number) => {
    if (indice > 0) doc.addPage();
    doc.setFillColor(...INDIGO_ACCENT);
    doc.rect(0, 0, 4, PAGE_HEIGHT, "F");
  };

  const tituloDoSlide = (texto: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...INK_TITLE);
    doc.text(texto, MARGIN, 32);

    doc.setFillColor(...INDIGO_ACCENT);
    doc.rect(MARGIN, 38, 22, 1.2, "F");
  };

  const TOTAL_PAGINAS = 4;

  // 1. Quem sou eu
  abrirPagina(0);
  tituloDoSlide(draft.quemSouEu.title);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...INK_BODY);
  let y = 55;
  for (const linha of doc.splitTextToSize(draft.quemSouEu.body, CONTENT_WIDTH)) {
    doc.text(linha, MARGIN, y);
    y += 7;
  }
  rodape(1, TOTAL_PAGINAS);

  // 2. Projetos e realizações
  abrirPagina(1);
  tituloDoSlide(isEn ? "Projects & achievements" : "Projetos e realizações");
  const selecionados = new Set(draft.projetosSelecionados);
  const projetosSelecionados = data.projects.filter((p) => selecionados.has(p.id));
  const grupos = agruparPorCategoria(projetosSelecionados, data.categories).filter(
    (g) => g.categoria !== null || g.itens.length > 0
  );

  y = 55;
  const alturaMaxima = PAGE_HEIGHT - 22;
  for (const grupo of grupos) {
    if (y > alturaMaxima - 10) break; // conteúdo demais para uma página só — corta em vez de invadir o rodapé
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INDIGO_HEADING);
    const nomeCategoria = grupo.categoria
      ? (isEn && grupo.categoria.nameEn) || grupo.categoria.name
      : isEn ? "Other projects" : "Outros projetos";
    doc.text(nomeCategoria.toUpperCase(), MARGIN, y);
    y += 6.5;

    for (const projeto of grupo.itens) {
      if (y > alturaMaxima) break;
      const titulo = (isEn && projeto.titleEn) || projeto.title;
      const descricao = (isEn && projeto.descriptionEn) || projeto.description || "";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...INK_TITLE);
      doc.text(`•  ${titulo}`, MARGIN + 2, y);
      y += 5.5;

      if (descricao) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...INK_BODY);
        for (const linha of doc.splitTextToSize(descricao, CONTENT_WIDTH - 6)) {
          if (y > alturaMaxima) break;
          doc.text(linha, MARGIN + 6, y);
          y += 5;
        }
      }
      y += 2.5;
    }
    y += 2;
  }
  rodape(2, TOTAL_PAGINAS);

  // 3. Habilidades & experiência
  abrirPagina(2);
  tituloDoSlide(draft.habilidades.title);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...INK_BODY);
  y = 55;
  for (const linha of doc.splitTextToSize(draft.habilidades.body, CONTENT_WIDTH)) {
    doc.text(linha, MARGIN, y);
    y += 7;
  }
  rodape(3, TOTAL_PAGINAS);

  // 4. Por que este programa
  abrirPagina(3);
  tituloDoSlide(draft.motivacao.title);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...INK_BODY);
  y = 55;
  for (const linha of doc.splitTextToSize(draft.motivacao.body, CONTENT_WIDTH)) {
    doc.text(linha, MARGIN, y);
    y += 7;
  }
  rodape(4, TOTAL_PAGINAS);

  doc.save(`elevator-pitch-${data.profile.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
