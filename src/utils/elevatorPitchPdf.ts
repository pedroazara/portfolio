import { ResumeData } from "../types";
import { Language } from "../lib/translations";
import { conteudoExperienciaPitch, periodoPitch, resumoPitch } from "./pitchExperienceContent";
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

  const [cnpemResponse, uflaResponse] = await Promise.all([
    fetch("/brand/cnpem-white.png"),
    fetch("/brand/ufla-logo-white.png"),
  ]);
  if (!cnpemResponse.ok || !uflaResponse.ok) throw new Error("Não foi possível carregar as marcas institucionais.");
  const [cnpemLogo, uflaLogo] = await Promise.all([
    cnpemResponse.arrayBuffer().then(buffer => new Uint8Array(buffer)),
    uflaResponse.arrayBuffer().then(buffer => new Uint8Array(buffer)),
  ]);
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
    doc.setFillColor(16, 37, 54);
    doc.rect(0, 0, PAGE_WIDTH, 17, "F");
    doc.addImage(uflaLogo, "PNG", MARGIN, 3.1, 22, 22 * 198 / 400);
    doc.addImage(cnpemLogo, "PNG", PAGE_WIDTH - MARGIN - 22, 2.8, 22, 22 * 103 / 199);
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

  // 2. Experiência, com o mesmo conteúdo conciso da apresentação.
  abrirPagina(1);
  tituloDoSlide(draft.habilidades.title);
  const { principal, atividades, competencias } = conteudoExperienciaPitch(data.experiences, data.academicActivities || [], language);
  const writeBlock = (text: string, x: number, top: number, width: number, size = 12, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...INK_BODY);
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, x, top);
    return top + lines.length * size * 0.43;
  };
  const columnWidth = (CONTENT_WIDTH - 16) / 2;
  y = writeBlock(isEn ? "RESEARCH EXPERIENCE" : "EXPERIÊNCIA EM PESQUISA", MARGIN, 54, columnWidth, 10, true) + 7;
  if (principal) {
    y = writeBlock(periodoPitch(principal, language), MARGIN, y, columnWidth, 10) + 4;
    y = writeBlock((isEn && principal.roleEn) || principal.role, MARGIN, y, columnWidth, 16, true) + 5;
    y = writeBlock((isEn && principal.companyEn) || principal.company, MARGIN, y, columnWidth) + 5;
    writeBlock(resumoPitch((isEn && principal.descriptionEn) || principal.description), MARGIN, y, columnWidth);
  }
  const rightX = MARGIN + columnWidth + 16;
  y = writeBlock(isEn ? "EXTRACURRICULAR EXPERIENCE" : "EXPERIÊNCIAS EXTRACURRICULARES", rightX, 54, columnWidth, 10, true) + 7;
  for (const activity of atividades) {
    const name = ((isEn && activity.nameEn) || activity.name).split(/\s[—–-]\s/)[0];
    y = writeBlock(name, rightX, y, columnWidth, 14, true) + 2;
    y = writeBlock(periodoPitch(activity, language), rightX, y, columnWidth, 9) + 3;
    y = writeBlock(resumoPitch((isEn && activity.descriptionEn) || activity.description, 110), rightX, y, columnWidth, 11) + 8;
  }
  if (competencias.length) {
    writeBlock(isEn ? "TECHNICAL SKILLS" : "COMPETÊNCIAS TÉCNICAS", MARGIN, 177, CONTENT_WIDTH, 10, true);
    writeBlock(competencias.join(" / "), MARGIN, 186, CONTENT_WIDTH, 12);
  }
  rodape(2, TOTAL_PAGINAS);

  // 3. Projetos e realizações
  abrirPagina(2);
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
