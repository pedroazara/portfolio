import type { jsPDF } from "jspdf";
import { ResumeData } from "../types";
import { slugOf } from "./slug";
import { formatarData, formatarPeriodo } from "../lib/periodo";

/**
 * Paleta do PDF: os mesmos índigos do site (ver `--acento` em index.css),
 * não o azul-marinho genérico que existia antes — que não vinha de lugar
 * nenhum da identidade visual, só de um exemplo de currículo qualquer.
 */
export const INK_TITLE: [number, number, number] = [15, 23, 42]; // slate-900 — nome, cargo, títulos de item
export const INK_BODY: [number, number, number] = [51, 65, 85]; // slate-700 — corpo de texto
export const INK_META: [number, number, number] = [100, 116, 139]; // slate-500 — datas, metadados
export const INDIGO_HEADING: [number, number, number] = [67, 56, 202]; // indigo-700 — título de seção
export const INDIGO_ACCENT: [number, number, number] = [79, 70, 229]; // indigo-600 — sub-título, link, instituição
export const RULE_SOFT: [number, number, number] = [226, 232, 240]; // slate-200 — linha divisória

/**
 * O jsPDF pesa mais de 150 KB e só serve para exportar PDFs. Carregá-lo sob
 * demanda tira esse peso do carregamento inicial de quem só quer ler o site.
 * O `import type` acima é apagado na compilação — não custa nada em runtime.
 */
export async function loadJsPDF() {
  const mod = await import("jspdf");
  return mod.jsPDF;
}

/** Mesma ideia do jsPDF acima: só entra no bundle de quem pede o PDF. */
async function loadQRCode() {
  const mod = await import("qrcode");
  return mod.default;
}

/**
 * Creates and returns the jsPDF document instance for the CV.
 * Optimized for Latin-1 encoding (no non-Latin Unicode glyphs like stars or bullets),
 * clean word-wrapping, active clickable links, and ATS compatibility.
 */
export async function createResumePDFDoc(data?: ResumeData): Promise<jsPDF | null> {
  if (!data || !data.profile) {
    console.error("Dados de currículo não encontrados para geração de PDF.");
    return null;
  }
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_LEFT = 15;
  const MARGIN_RIGHT = 15;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 180mm
  const BOTTOM_LIMIT = 280;

  let y = 15; // Running Y position in mm

  // Helper: Safely add page and reset Y if drawing would overflow the page limit
  const ensureSpace = (neededHeight: number): void => {
    if (y + neededHeight > BOTTOM_LIMIT) {
      doc.addPage();
      y = 15; // Reset to top margin
    }
  };

  // Helper: Render Section Title with a short accent bar and underline
  const renderSectionHeader = (title: string) => {
    ensureSpace(18);
    y += 4;

    // Traço de acento à esquerda do título — o mesmo fio de luz que abre
    // cada cartão de seção no site (`SECTION_CARD_CLASS` em cardStyle.ts),
    // só que vertical: um traço curto em vez da régua cinza de ponta a
    // ponta que existia aqui.
    doc.setFillColor(INDIGO_ACCENT[0], INDIGO_ACCENT[1], INDIGO_ACCENT[2]);
    doc.rect(MARGIN_LEFT, y - 3.3, 1.1, 4.3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(INDIGO_HEADING[0], INDIGO_HEADING[1], INDIGO_HEADING[2]);
    doc.setCharSpace(0.3);
    doc.text(title.toUpperCase(), MARGIN_LEFT + 3.2, y);
    doc.setCharSpace(0);

    y += 2.5;
    // Linha divisória, mais discreta agora que o traço de acento já assina a seção.
    doc.setDrawColor(RULE_SOFT[0], RULE_SOFT[1], RULE_SOFT[2]);
    doc.setLineWidth(0.35);
    doc.line(MARGIN_LEFT, y, MARGIN_LEFT + CONTENT_WIDTH, y);

    y += 5.5; // Space after header line
  };

  // ==========================================
  // 1. HEADER SECTION (Name, Title, Contact Info)
  // ==========================================
  const profile = data.profile;

  // Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(INK_TITLE[0], INK_TITLE[1], INK_TITLE[2]);
  const nameWidth = doc.getTextWidth(profile.name);
  doc.text(profile.name, MARGIN_LEFT, y);
  y += 7.5;

  // Title / Subtitle
  if (profile.title) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(INDIGO_ACCENT[0], INDIGO_ACCENT[1], INDIGO_ACCENT[2]);
    doc.text(profile.title, MARGIN_LEFT, y);
    y += 6;
  }

  // Traço de acento sob o cabeçalho — o mesmo gesto da abertura do site
  // (`bg-gradient-to-r ... from-indigo-600` em ResumeHeader.tsx), aqui como
  // um traço sólido: o PDF não tem gradiente, mas a cor e a proporção vêm
  // do mesmo lugar.
  doc.setFillColor(INDIGO_ACCENT[0], INDIGO_ACCENT[1], INDIGO_ACCENT[2]);
  doc.rect(MARGIN_LEFT, y - 2.6, 16, 0.9, "F");
  y += 2.5;

  // QR code para o portfólio online, no canto superior direito. Só entra se
  // houver espaço de sobra ao lado do nome — nomes compridos já ocupam a
  // largura toda, e um QR por cima do texto seria pior do que nenhum QR.
  const QR_SIZE = 16;
  const QR_Y = 9;
  const qrX = PAGE_WIDTH - MARGIN_RIGHT - QR_SIZE;
  if (MARGIN_LEFT + nameWidth < qrX - 4) {
    try {
      const siteUrlRaw = (profile.website && profile.website.trim()) || "https://pedroazara.vercel.app";
      const qrTarget = /^https?:\/\//i.test(siteUrlRaw) ? siteUrlRaw : `https://${siteUrlRaw}`;
      const QRCode = await loadQRCode();
      const qrDataUrl = await QRCode.toDataURL(qrTarget, {
        margin: 0,
        width: 240,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      doc.addImage(qrDataUrl, "PNG", qrX, QR_Y, QR_SIZE, QR_SIZE);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(INK_META[0], INK_META[1], INK_META[2]);
      const qrLabel = qrTarget.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      doc.text(qrLabel, qrX + QR_SIZE / 2, QR_Y + QR_SIZE + 3, { align: "center" });
    } catch (err) {
      // Um QR a menos não impede o resto do currículo de sair.
      console.error("Não foi possível gerar o QR code do currículo.", err);
    }
  }

  // Contact Grid - Simple, compact contact metadata string without trailing pipes
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(INK_META[0], INK_META[1], INK_META[2]);

  const rawContacts: (string | undefined)[] = [
    profile.location,
    profile.phone,
    profile.email,
    profile.website,
    profile.linkedin ? profile.linkedin.replace(/^https?:\/\/(www\.)?/, "") : undefined,
    profile.github ? profile.github.replace(/^https?:\/\/(www\.)?/, "") : undefined,
  ];
  const contacts = rawContacts.filter((item): item is string => Boolean(item && item.trim().length > 0));

  // Draw contact strings joined cleanly
  const contactText = contacts.join("  |  ");
  const contactLines = doc.splitTextToSize(contactText, CONTENT_WIDTH);
  
  for (const line of contactLines) {
    ensureSpace(4.5);
    doc.text(line, MARGIN_LEFT, y);
    y += 4.5;
  }
  y += 2.5; // space under contact header

  // ==========================================
  // 2. PROFILE / BIO SECTION
  // ==========================================
  if (profile.bio && profile.bio.trim().length > 0) {
    renderSectionHeader("Perfil Profissional");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // slate-800
    
    const bioTextLines = doc.splitTextToSize(profile.bio.trim(), CONTENT_WIDTH);
    for (const line of bioTextLines) {
      ensureSpace(4.5);
      doc.text(line, MARGIN_LEFT, y);
      y += 4.5;
    }
    y += 3; // spacing after bio
  }

  // ==========================================
  // 3. FORMAÇÃO ACADÊMICA
  // ==========================================
  if (data.educations && data.educations.length > 0) {
    renderSectionHeader("Formação Acadêmica");

    const sortedEdu = [...data.educations].sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      return b.startDate.localeCompare(a.startDate);
    });

    sortedEdu.forEach((edu, idx) => {
      ensureSpace(16);

      const dateStr = formatarPeriodo(edu.startDate, edu.endDate, edu.current, "pt");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const dateWidth = doc.getTextWidth(dateStr);

      const fieldStudy = edu.fieldOfStudy ? ` em ${edu.fieldOfStudy}` : "";
      const degreeField = `${edu.degree}${fieldStudy}`;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);

      const maxTitleWidthLine1 = CONTENT_WIDTH - dateWidth - 4;
      const titleLines = doc.splitTextToSize(degreeField, maxTitleWidthLine1);

      doc.text(titleLines[0], MARGIN_LEFT, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(dateStr, PAGE_WIDTH - MARGIN_RIGHT - dateWidth, y);

      if (titleLines.length > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        for (let i = 1; i < titleLines.length; i++) {
          y += 4.5;
          ensureSpace(4.5);
          doc.text(titleLines[i], MARGIN_LEFT, y);
        }
      }

      y += 4.5;

      // Institution
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229); // Indigo
      const instLines = doc.splitTextToSize(edu.institution, CONTENT_WIDTH);
      for (const line of instLines) {
        ensureSpace(4.5);
        doc.text(line, MARGIN_LEFT, y);
        y += 4.5;
      }

      // Short Description
      if (edu.description && edu.description.trim().length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        
        const descLines = doc.splitTextToSize(edu.description.trim(), CONTENT_WIDTH);
        for (const line of descLines) {
          ensureSpace(4.5);
          doc.text(line, MARGIN_LEFT, y);
          y += 4.5;
        }
      }

      y += (idx < sortedEdu.length - 1) ? 4 : 3;
    });
  }

  // ==========================================
  // 4. EXPERIÊNCIA ACADÊMICA
  // ==========================================
  if (data.experiences && data.experiences.length > 0) {
    renderSectionHeader("Experiência Acadêmica");

    // Sort experiences: current first, then by date descending
    const sortedExp = [...data.experiences].sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      return b.startDate.localeCompare(a.startDate);
    });

    sortedExp.forEach((exp, idx) => {
      ensureSpace(18); // Header of experience block

      const dateStr = formatarPeriodo(exp.startDate, exp.endDate, exp.current, "pt");
      const locationStr = exp.location ? ` | ${exp.location}` : "";
      const metaStr = `${dateStr}${locationStr}`;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      const metaWidth = doc.getTextWidth(metaStr);

      const titleText = `${exp.role} - ${exp.company}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900

      // Calculate max width for first line to prevent overlap with right-aligned meta
      const maxTitleWidthLine1 = CONTENT_WIDTH - metaWidth - 4;
      const titleLines = doc.splitTextToSize(titleText, maxTitleWidthLine1);

      // Draw first line of title and right-aligned meta
      doc.text(titleLines[0], MARGIN_LEFT, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(metaStr, PAGE_WIDTH - MARGIN_RIGHT - metaWidth, y);

      // Draw remaining lines of title if wrapped
      if (titleLines.length > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        for (let i = 1; i < titleLines.length; i++) {
          y += 4.5;
          ensureSpace(4.5);
          doc.text(titleLines[i], MARGIN_LEFT, y);
        }
      }

      y += 5;

      // Description
      if (exp.description && exp.description.trim().length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85); // slate-700

        const descLines = doc.splitTextToSize(exp.description.trim(), CONTENT_WIDTH);
        for (const line of descLines) {
          ensureSpace(4.5);
          doc.text(line, MARGIN_LEFT, y);
          y += 4.5;
        }
      }

      y += (idx < sortedExp.length - 1) ? 5 : 3; // Space between experiences
    });
  }

  // ==========================================
  // 5. ATIVIDADES ACADÊMICAS
  // ==========================================
  if (data.academicActivities && data.academicActivities.length > 0) {
    renderSectionHeader("Atividades Acadêmicas");

    const sortedAct = [...data.academicActivities].sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      return b.startDate.localeCompare(a.startDate);
    });

    sortedAct.forEach((act, idx) => {
      ensureSpace(16);

      const dateStr = formatarPeriodo(act.startDate, act.endDate, act.current, "pt");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const dateWidth = doc.getTextWidth(dateStr);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);

      const maxTitleWidthLine1 = CONTENT_WIDTH - dateWidth - 4;
      const titleLines = doc.splitTextToSize(act.name, maxTitleWidthLine1);

      doc.text(titleLines[0], MARGIN_LEFT, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(dateStr, PAGE_WIDTH - MARGIN_RIGHT - dateWidth, y);

      if (titleLines.length > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        for (let i = 1; i < titleLines.length; i++) {
          y += 4.5;
          ensureSpace(4.5);
          doc.text(titleLines[i], MARGIN_LEFT, y);
        }
      }

      y += 4.5;

      // Short description (subtitle)
      if (act.description && act.description.trim().length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(79, 70, 229); // Indigo
        const descLines = doc.splitTextToSize(act.description.trim(), CONTENT_WIDTH);
        for (const line of descLines) {
          ensureSpace(4.5);
          doc.text(line, MARGIN_LEFT, y);
          y += 4.5;
        }
      }

      // Extra content (body paragraph)
      if (act.extraContent && act.extraContent.trim().length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);

        const extraLines = doc.splitTextToSize(act.extraContent.trim(), CONTENT_WIDTH);
        for (const line of extraLines) {
          ensureSpace(4.5);
          doc.text(line, MARGIN_LEFT, y);
          y += 4.5;
        }
      }

      y += (idx < sortedAct.length - 1) ? 4 : 3;
    });
  }

  // ==========================================
  // 6. PROJETOS RELEVANTES (Apenas Resumo e Link do Post no Blog)
  // ==========================================
  if (data.projects && data.projects.length > 0) {
    const featuredProjects = data.projects.filter(p => p.featured);
    const candidateProjects = featuredProjects.length > 0 ? featuredProjects : data.projects;
    // Limit to top 3 or 4 main projects
    const projectsToRender = candidateProjects.slice(0, 4);

    if (projectsToRender.length > 0) {
      renderSectionHeader("Projetos Relevantes");

      const origin = typeof window !== "undefined" ? window.location.origin : "https://pedroazara.dev";

      projectsToRender.forEach((proj, idx) => {
        ensureSpace(18);

        // Link para o projeto no próprio site. Usa o mesmo `slugOf` das outras
        // páginas — antes ia direto de `proj.id`, que ignora o código de URL
        // editável no formulário do projeto: renomear o link não mudava o que
        // ia para o PDF, e o link impresso apontava para um endereço vencido.
        const projectLinkUrl = `${origin}/project/${encodeURIComponent(slugOf(proj))}`;
        const rightLabel = "Ver no Site";
        const projectTitle = proj.title;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        const metaWidth = rightLabel ? doc.getTextWidth(rightLabel) : 0;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(INDIGO_ACCENT[0], INDIGO_ACCENT[1], INDIGO_ACCENT[2]);

        const maxTitleWidthLine1 = metaWidth > 0 ? (CONTENT_WIDTH - metaWidth - 5) : CONTENT_WIDTH;
        const titleLines = doc.splitTextToSize(projectTitle, maxTitleWidthLine1);

        // Draw line 1 of title
        if (projectLinkUrl) {
          doc.textWithLink(titleLines[0], MARGIN_LEFT, y, { url: projectLinkUrl });
        } else {
          doc.text(titleLines[0], MARGIN_LEFT, y);
        }

        // Display "Ver Projeto" on the right if link exists
        if (projectLinkUrl && rightLabel) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(79, 70, 229);
          doc.textWithLink(rightLabel, PAGE_WIDTH - MARGIN_RIGHT - metaWidth, y, { url: projectLinkUrl });
        }

        // Draw subsequent lines of title if wrapped
        if (titleLines.length > 1) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          doc.setTextColor(INDIGO_ACCENT[0], INDIGO_ACCENT[1], INDIGO_ACCENT[2]);
          for (let i = 1; i < titleLines.length; i++) {
            y += 4.5;
            ensureSpace(4.5);
            if (projectLinkUrl) {
              doc.textWithLink(titleLines[i], MARGIN_LEFT, y, { url: projectLinkUrl });
            } else {
              doc.text(titleLines[i], MARGIN_LEFT, y);
            }
          }
        }

        y += 4.5;

        // Project Tags / Technologies
        if (proj.tags && proj.tags.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139); // Slate-500
          const techText = `Tecnologias: ${proj.tags.join(", ")}`;
          const techLines = doc.splitTextToSize(techText, CONTENT_WIDTH);
          for (const line of techLines) {
            ensureSpace(4);
            doc.text(line, MARGIN_LEFT, y);
            y += 4;
          }
        }

        // Resumo Apenas (Usando proj.description curto, nunca texto completo)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);

        const summaryText = proj.description || "";
        if (summaryText.trim().length > 0) {
          const descLines = doc.splitTextToSize(summaryText.trim(), CONTENT_WIDTH);
          for (const line of descLines) {
            ensureSpace(4.5);
            doc.text(line, MARGIN_LEFT, y);
            y += 4.5;
          }
        }

        y += (idx < projectsToRender.length - 1) ? 4 : 3;
      });
    }
  }

  // ==========================================
  // 7. HABILIDADES TÉCNICAS (Com Latin-1 Seguro sem caracteres inválidos)
  // ==========================================
  if (data.skills && data.skills.length > 0) {
    renderSectionHeader("Habilidades Técnicas");

    // Group skills by category
    const groupedSkills: { [category: string]: string[] } = {};
    data.skills.forEach((skill) => {
      if (!groupedSkills[skill.category]) {
        groupedSkills[skill.category] = [];
      }
      // Formatting skill name with clean ASCII level representation to prevent encoding issues
      groupedSkills[skill.category].push(`${skill.name} (${skill.level}/5)`);
    });

    /**
     * Grade de duas colunas.
     *
     * Antes cada categoria ocupava a largura inteira da página — com ~38
     * habilidades em 7 categorias, a seção estourava para uma segunda
     * página que sobrava quase inteiramente em branco. Duas colunas usam
     * a mesma largura total, mas em metade da altura: cada categoria entra
     * na coluna mais curta no momento (um encaixe guloso simples), o que
     * mantém as duas parelhas sem precisar calcular a altura de tudo antes
     * de desenhar.
     */
    const GUTTER = 8;
    const COL_WIDTH = (CONTENT_WIDTH - GUTTER) / 2;
    const COL_X = [MARGIN_LEFT, MARGIN_LEFT + COL_WIDTH + GUTTER];
    let colY: [number, number] = [y, y];

    const renderSkillCategory = (col: 0 | 1, category: string, skillsList: string[]) => {
      const x = COL_X[col];
      if (colY[col] + 15 > BOTTOM_LIMIT) {
        // Uma categoria não cabe nem começando: nova página, as duas
        // colunas recomeçam do topo. Simples, e nunca acontece com o
        // volume de habilidades que um currículo real acumula.
        doc.addPage();
        colY = [15, 15];
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(INDIGO_ACCENT[0], INDIGO_ACCENT[1], INDIGO_ACCENT[2]);
      doc.text(category, x, colY[col]);
      colY[col] += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(INK_BODY[0], INK_BODY[1], INK_BODY[2]);

      const skillLines = doc.splitTextToSize(skillsList.join("  |  "), COL_WIDTH);
      for (const line of skillLines) {
        if (colY[col] + 4 > BOTTOM_LIMIT) {
          doc.addPage();
          colY = [15, 15];
        }
        doc.text(line, x, colY[col]);
        colY[col] += 4;
      }

      colY[col] += 3; // espaço entre categorias, na mesma coluna
    };

    Object.entries(groupedSkills).forEach(([category, skillsList]) => {
      const col: 0 | 1 = colY[0] <= colY[1] ? 0 : 1;
      renderSkillCategory(col, category, skillsList);
    });

    y = Math.max(colY[0], colY[1]);
  }

  // ==========================================
  // 8. CURSOS E CERTIFICAÇÕES
  // ==========================================
  if (data.courses && data.courses.length > 0) {
    renderSectionHeader("Cursos e Certificações");

    data.courses.forEach((course, idx) => {
      ensureSpace(12);

      // Course Name
      const dateStr = formatarData(course.issueDate, "pt");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const dateWidth = dateStr ? doc.getTextWidth(dateStr) : 0;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);

      const maxTitleWidthLine1 = dateWidth > 0 ? (CONTENT_WIDTH - dateWidth - 4) : CONTENT_WIDTH;
      const titleLines = doc.splitTextToSize(course.name, maxTitleWidthLine1);

      doc.text(titleLines[0], MARGIN_LEFT, y);

      if (dateStr && dateWidth > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(dateStr, PAGE_WIDTH - MARGIN_RIGHT - dateWidth, y);
      }

      if (titleLines.length > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        for (let i = 1; i < titleLines.length; i++) {
          y += 4.5;
          ensureSpace(4.5);
          doc.text(titleLines[i], MARGIN_LEFT, y);
        }
      }

      y += 4.5;

      // Organization
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text(course.organization, MARGIN_LEFT, y);
      y += 4.5;

      // Description (if any)
      if (course.description && course.description.trim().length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const descLines = doc.splitTextToSize(course.description.trim(), CONTENT_WIDTH);
        for (const line of descLines) {
          ensureSpace(4);
          doc.text(line, MARGIN_LEFT, y);
          y += 4;
        }
      }

      y += (idx < data.courses!.length - 1) ? 4 : 3;
    });
  }

  return doc;
}

/**
 * Downloads the resume PDF directly with ATS-optimized, accent-free filename.
 * E.g.: Pedro-Henrique-Azara-de-Almeida-CV.pdf
 */
export async function generateResumePDF(data?: ResumeData) {
  const doc = await createResumePDFDoc(data);
  if (!doc) return;
  const rawName = data?.profile?.name || "Pedro Henrique Azara de Almeida";
  const cleanName = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents (Ázara -> Azara)
    .replace(/[^a-zA-Z0-9]+/g, "-") // replace spaces and special chars with dashes
    .replace(/^-+|-+$/g, "");      // trim leading/trailing dashes
  
  const fileName = `${cleanName || "Curriculo"}-CV.pdf`;
  doc.save(fileName);
}

/**
 * Returns a Blob URL for previewing the generated PDF.
 */
export async function getResumePDFBlobUrl(data?: ResumeData): Promise<string | null> {
  const doc = await createResumePDFDoc(data);
  if (!doc) return null;
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

