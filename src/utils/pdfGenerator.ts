import type { jsPDF } from "jspdf";
import { ResumeData } from "../types";

/**
 * O jsPDF pesa mais de 150 KB e só serve para exportar o currículo. Carregá-lo
 * sob demanda tira esse peso do carregamento inicial de quem só quer ler o site.
 * O `import type` acima é apagado na compilação — não custa nada em runtime.
 */
async function loadJsPDF() {
  const mod = await import("jspdf");
  return mod.jsPDF;
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

  // Helper: Render Section Title with LaTeX-style underline
  const renderSectionHeader = (title: string) => {
    ensureSpace(18);
    y += 4;
    
    // Navy Blue color for professional headings
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138); // slate-900 / dark navy accent
    doc.text(title.toUpperCase(), MARGIN_LEFT, y);
    
    y += 2.5;
    // Section line
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
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
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(profile.name, MARGIN_LEFT, y);
  y += 7.5;

  // Title / Subtitle
  if (profile.title) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(profile.title, MARGIN_LEFT, y);
    y += 6;
  }

  // Contact Grid - Simple, compact contact metadata string without trailing pipes
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500

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

      const dateStr = `${edu.startDate} - ${edu.current ? "Presente" : edu.endDate}`;
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

      const dateStr = `${exp.startDate} - ${exp.current ? "Presente" : exp.endDate}`;
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
  // 5. PROJETOS RELEVANTES (Apenas Resumo e Link do Post no Blog)
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

        // Determine Project Link URL (link to the project on the curriculum website itself)
        const projectLinkUrl = `${origin}/project/${encodeURIComponent(proj.id)}`;
        const rightLabel = "Ver no Site";
        const projectTitle = proj.title;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        const metaWidth = rightLabel ? doc.getTextWidth(rightLabel) : 0;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(30, 58, 138); // Navy blue accent for link title

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
          doc.setTextColor(30, 58, 138); // Navy blue accent for title
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
  // 6. HABILIDADES TÉCNICAS (Com Latin-1 Seguro sem caracteres inválidos)
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

    Object.entries(groupedSkills).forEach(([category, skillsList], idx) => {
      ensureSpace(15);

      // Category Sub-heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 58, 138); // Navy Blue
      doc.text(category, MARGIN_LEFT, y);
      y += 4;

      // List skills inline
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85); // Slate-700
      
      const skillsLineText = skillsList.join("  |  ");
      const skillLines = doc.splitTextToSize(skillsLineText, CONTENT_WIDTH);
      
      for (const line of skillLines) {
        ensureSpace(4.5);
        doc.text(line, MARGIN_LEFT, y);
        y += 4.5;
      }
      
      y += 2.5; // space between categories
    });
  }

  // ==========================================
  // 7. CURSOS E CERTIFICAÇÕES
  // ==========================================
  if (data.courses && data.courses.length > 0) {
    renderSectionHeader("Cursos e Certificações");

    data.courses.forEach((course, idx) => {
      ensureSpace(12);

      // Course Name
      const dateStr = course.issueDate || "";
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

