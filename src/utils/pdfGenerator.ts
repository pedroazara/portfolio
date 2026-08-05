import { jsPDF } from "jspdf";
import { ResumeData } from "../types";

/**
 * Generates a high-fidelity, professional Curriculum Vitae PDF from resume data.
 * Features vector-drawn headers, standard margins, structured sections, word-wrapping,
 * and robust multi-page overflow page-breaking.
 */
export function generateResumePDF(data?: ResumeData) {
  if (!data || !data.profile) {
    console.error("Dados de currículo não encontrados para geração de PDF.");
    return;
  }
  const doc = new jsPDF({
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

  // Contact Grid - Simple, compact contact metadata string
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500

  const contacts: string[] = [];
  if (profile.location) contacts.push(profile.location);
  if (profile.phone) contacts.push(profile.phone);
  if (profile.email) contacts.push(profile.email);
  if (profile.website) contacts.push(profile.website);
  if (profile.linkedin) {
    const cleanLinkedin = profile.linkedin.replace(/https?:\/\/(www\.)?/, "");
    contacts.push(cleanLinkedin);
  }
  if (profile.github) {
    const cleanGithub = profile.github.replace(/https?:\/\/(www\.)?/, "");
    contacts.push(cleanGithub);
  }

  // Draw contact strings grouped nicely
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
  // 3. EXPERIÊNCIAS PROFISSIONAIS
  // ==========================================
  if (data.experiences && data.experiences.length > 0) {
    renderSectionHeader("Experiência Profissional");

    // Sort experiences: current first, then by date descending
    const sortedExp = [...data.experiences].sort((a, b) => {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
      return b.startDate.localeCompare(a.startDate);
    });

    sortedExp.forEach((exp, idx) => {
      ensureSpace(18); // Header of experience block
      
      // Role & Company
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`${exp.role} — ${exp.company}`, MARGIN_LEFT, y);
      
      // Date and location line (right aligned or on the same line)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      
      const dateStr = `${exp.startDate} – ${exp.current ? "Presente" : exp.endDate}`;
      const locationStr = exp.location ? ` | ${exp.location}` : "";
      const metaStr = `${dateStr}${locationStr}`;
      
      // Calculate right alignment for metaStr
      const metaWidth = doc.getTextWidth(metaStr);
      doc.text(metaStr, PAGE_WIDTH - MARGIN_RIGHT - metaWidth, y);
      
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
  // 4. FORMAÇÃO ACADÊMICA
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

      // Degree, Field & Institution
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      
      const fieldStudy = edu.fieldOfStudy ? ` em ${edu.fieldOfStudy}` : "";
      doc.text(`${edu.degree}${fieldStudy}`, MARGIN_LEFT, y);
      
      // Dates right aligned
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      
      const dateStr = `${edu.startDate} – ${edu.current ? "Presente" : edu.endDate}`;
      const dateWidth = doc.getTextWidth(dateStr);
      doc.text(dateStr, PAGE_WIDTH - MARGIN_RIGHT - dateWidth, y);

      y += 4.5;

      // Institution
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text(edu.institution, MARGIN_LEFT, y);
      y += 4.5;

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
  // 5. PROJETOS RELEVANTES
  // ==========================================
  const featuredProjects = data.projects ? data.projects.filter(p => p.featured) : [];
  const projectsToRender = featuredProjects.length > 0 ? featuredProjects : (data.projects || []);

  if (projectsToRender.length > 0) {
    renderSectionHeader("Projetos Relevantes");

    projectsToRender.forEach((proj, idx) => {
      ensureSpace(18);

      // Project Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      
      // Add featured badge indicator in text if featured
      const isFeatured = proj.featured ? " [Destaque]" : "";
      doc.text(`${proj.title}${isFeatured}`, MARGIN_LEFT, y);

      // Links (Github / URL if any)
      const projectLinks: string[] = [];
      if (proj.projectUrl) projectLinks.push(proj.projectUrl.replace(/https?:\/\/(www\.)?/, ""));
      if (proj.githubUrl) projectLinks.push(`github.com/${proj.githubUrl.replace(/https?:\/\/(www\.)?github\.com\//, "")}`);
      
      if (projectLinks.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const linkStr = projectLinks.join("  |  ");
        const linkWidth = doc.getTextWidth(linkStr);
        doc.text(linkStr, PAGE_WIDTH - MARGIN_RIGHT - linkWidth, y);
      }

      y += 4.5;

      // Project Tags / Technologies
      if (proj.tags && proj.tags.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229); // Indigo
        doc.text(`Tecnologias: ${proj.tags.join(", ")}`, MARGIN_LEFT, y);
        y += 4;
      }

      // Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      const mainDesc = proj.detailedDescription || proj.description;
      const descLines = doc.splitTextToSize(mainDesc.trim(), CONTENT_WIDTH);
      for (const line of descLines) {
        ensureSpace(4.5);
        doc.text(line, MARGIN_LEFT, y);
        y += 4.5;
      }

      // Scientific relevance
      if (proj.scientificRelevance && proj.scientificRelevance.trim().length > 0) {
        ensureSpace(8);
        y += 1;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105); // slate-600
        
        const scientificLines = doc.splitTextToSize(`Relevância Científica: ${proj.scientificRelevance.trim()}`, CONTENT_WIDTH);
        for (const line of scientificLines) {
          ensureSpace(4);
          doc.text(line, MARGIN_LEFT, y);
          y += 4;
        }
      }

      y += (idx < projectsToRender.length - 1) ? 5 : 3;
    });
  }

  // ==========================================
  // 6. HABILIDADES TÉCNICAS
  // ==========================================
  if (data.skills && data.skills.length > 0) {
    renderSectionHeader("Habilidades Técnicas");

    // Group skills by category
    const groupedSkills: { [category: string]: string[] } = {};
    data.skills.forEach((skill) => {
      if (!groupedSkills[skill.category]) {
        groupedSkills[skill.category] = [];
      }
      // Formatting skill name with level (percentage/stars indicator)
      const levelStar = "★".repeat(skill.level) + "☆".repeat(5 - skill.level);
      groupedSkills[skill.category].push(`${skill.name} (${levelStar})`);
    });

    Object.entries(groupedSkills).forEach(([category, skillsList], idx) => {
      ensureSpace(15);

      // Category Sub-heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 58, 138); // Navy Blue
      doc.text(category, MARGIN_LEFT, y);
      y += 4;

      // List skills inline or in a block
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85); // Slate-700
      
      const skillsLineText = skillsList.join("  •  ");
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(course.name, MARGIN_LEFT, y);

      // Issue Date right aligned
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const dateStr = course.issueDate;
      const dateWidth = doc.getTextWidth(dateStr);
      doc.text(dateStr, PAGE_WIDTH - MARGIN_RIGHT - dateWidth, y);

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

  // Save the PDF
  const userNameClean = profile.name.toLowerCase().replace(/\s+/g, "_") || "curriculo";
  doc.save(`curriculo_vitae_${userNameClean}.pdf`);
}
