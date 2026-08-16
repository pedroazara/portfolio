/**
 * Utility functions for Gemini AI Auto-Translation API
 */
import { GoogleGenAI } from "@google/genai";
import { ResumeData } from "../types";

export interface TranslationResponse {
  translations?: Record<string, string>;
  translation?: string;
  error?: string;
}

/**
 * Fallback client-side translation using VITE_GEMINI_API_KEY if serverless route is unreachable
 */
async function clientSideTranslateFields<T extends Record<string, string>>(
  validFields: Record<string, string>
): Promise<Partial<T>> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Serviço de tradução indisponível. Certifique-se de configurar a variável GEMINI_API_KEY no painel da Vercel (Settings -> Environment Variables)."
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Você é um tradutor especialista acadêmico e profissional em currículos e portfólios.
Traduza os valores dos textos fornecidos no objeto JSON do Português (PT-BR) para um Inglês fluente, natural e profissional.
Mantenha a precisão de termos técnicos (física, engenharia, óptica, programação, instrumentação).
Mantenha a formatação original (quebras de linha, listas, markdown se houver).
Retorne APENAS um objeto JSON válido mapeando as mesmas chaves para os valores traduzidos em inglês.

JSON de entrada:
${JSON.stringify(validFields, null, 2)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const responseText = response.text || "{}";
  return JSON.parse(responseText);
}

/**
 * Translates a single string from Portuguese to English using Gemini AI API.
 */
export async function translateText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "";

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("application/json")) {
      // Fallback to client-side if server route failed or returned HTML
      const fallbackResult = await clientSideTranslateFields({ text });
      return fallbackResult.text || "";
    }

    const data: TranslationResponse = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return data.translation || "";
  } catch (error: any) {
    console.warn("Rota backend /api/translate falhou, tentando fallback...", error);
    try {
      const fallbackResult = await clientSideTranslateFields({ text });
      return (fallbackResult as any).text || "";
    } catch (fallbackErr: any) {
      console.error("Erro na tradução com Gemini AI:", fallbackErr);
      throw new Error(
        fallbackErr.message ||
          "Não foi possível traduzir o texto. Verifique se a chave GEMINI_API_KEY foi adicionada no painel da Vercel."
      );
    }
  }
}

/**
 * Translates multiple Portuguese form fields into English fields simultaneously.
 * Pass a dictionary object of PT fields, e.g. { title: "Engenheiro", description: "..." }
 * Returns a dictionary object of translated EN fields.
 */
export async function translateFields<T extends Record<string, string>>(
  fields: T
): Promise<Partial<T>> {
  // Filter out empty or non-string values
  const validFields: Record<string, string> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (typeof val === "string" && val.trim().length > 0) {
      validFields[key] = val;
    }
  }

  if (Object.keys(validFields).length === 0) {
    return {};
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: validFields }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("application/json")) {
      const errData = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
      if (errData.error) {
        throw new Error(errData.error);
      }
      // If server returned non-200 or HTML, try client-side fallback
      return await clientSideTranslateFields<T>(validFields);
    }

    const data: TranslationResponse = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return (data.translations as Partial<T>) || {};
  } catch (error: any) {
    console.warn("Rota /api/translate falhou, tentando fallback cliente...", error);
    try {
      return await clientSideTranslateFields<T>(validFields);
    } catch (fallbackErr: any) {
      console.error("Erro na tradução de campos com Gemini AI:", fallbackErr);
      throw new Error(
        error.message && !error.message.includes("fetch")
          ? error.message
          : fallbackErr.message || "Erro de conexão na tradução. Verifique se a chave GEMINI_API_KEY está configurada na Vercel."
      );
    }
  }
}

export interface TranslateAllStep {
  key: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
}

export interface TranslateAllResult {
  data: ResumeData;
  errors: { section: string; message: string }[];
}

/**
 * Ordered list of the sections `translateAllContent` walks through, used both
 * to run the translation and to render a progress checklist in the UI.
 */
export const TRANSLATE_ALL_STEPS: { key: string; label: string }[] = [
  { key: "profile", label: "Perfil" },
  { key: "educations", label: "Formação Acadêmica" },
  { key: "experiences", label: "Experiência em Pesquisa" },
  { key: "academicActivities", label: "Atividades Acadêmicas" },
  { key: "skills", label: "Habilidades" },
  { key: "courses", label: "Cursos & Certificações" },
  { key: "categories", label: "Categorias de Projetos" },
  { key: "projects", label: "Projetos (título, resumo, categoria)" },
  { key: "posts", label: "Posts do Blog (título, resumo, categoria)" },
];

/**
 * Re-translates every short/structured PT field across the resume into
 * English in one pass, overwriting any existing translation. Long-form
 * content (blog post body, detailed project descriptions) is intentionally
 * left alone — those keep using the per-item translate button in their own
 * editors, since translating them here would be slow and costly.
 *
 * Each section is isolated: if one section's API call fails, it keeps its
 * previous English content and the rest of the resume still gets updated.
 */
export async function translateAllContent(
  data: ResumeData,
  onStepChange?: (key: string, status: TranslateAllStep["status"], error?: string) => void
): Promise<TranslateAllResult> {
  const result: ResumeData = { ...data };
  const errors: { section: string; message: string }[] = [];

  const runSection = async (key: string, label: string, task: () => Promise<void>) => {
    onStepChange?.(key, "running");
    try {
      await task();
      onStepChange?.(key, "done");
    } catch (err: any) {
      const message = err?.message || "Falha desconhecida";
      errors.push({ section: label, message });
      onStepChange?.(key, "error", message);
    }
  };

  await runSection("profile", "Perfil", async () => {
    const fields: Record<string, string> = {};
    if (data.profile.title) fields.title = data.profile.title;
    if (data.profile.bio) fields.bio = data.profile.bio;
    if (Object.keys(fields).length === 0) return;
    const t = await translateFields(fields);
    result.profile = {
      ...result.profile,
      titleEn: t.title ?? result.profile.titleEn,
      bioEn: t.bio ?? result.profile.bioEn,
    };
  });

  await runSection("educations", "Formação Acadêmica", async () => {
    const fields: Record<string, string> = {};
    data.educations.forEach((edu, i) => {
      if (edu.institution) fields[`${i}__institution`] = edu.institution;
      if (edu.degree) fields[`${i}__degree`] = edu.degree;
      if (edu.fieldOfStudy) fields[`${i}__fieldOfStudy`] = edu.fieldOfStudy;
      if (edu.description) fields[`${i}__description`] = edu.description;
    });
    if (Object.keys(fields).length === 0) return;
    const t = await translateFields(fields);
    result.educations = data.educations.map((edu, i) => ({
      ...edu,
      institutionEn: t[`${i}__institution`] ?? edu.institutionEn,
      degreeEn: t[`${i}__degree`] ?? edu.degreeEn,
      fieldOfStudyEn: t[`${i}__fieldOfStudy`] ?? edu.fieldOfStudyEn,
      descriptionEn: t[`${i}__description`] ?? edu.descriptionEn,
    }));
  });

  await runSection("experiences", "Experiência em Pesquisa", async () => {
    const fields: Record<string, string> = {};
    data.experiences.forEach((exp, i) => {
      if (exp.role) fields[`${i}__role`] = exp.role;
      if (exp.location) fields[`${i}__location`] = exp.location;
      if (exp.description) fields[`${i}__description`] = exp.description;
      (exp.subperiods || []).forEach((sub, j) => {
        if (sub.title) fields[`${i}__sub${j}__title`] = sub.title;
        if (sub.description) fields[`${i}__sub${j}__description`] = sub.description;
      });
    });
    if (Object.keys(fields).length === 0) return;
    const t = await translateFields(fields);
    result.experiences = data.experiences.map((exp, i) => ({
      ...exp,
      roleEn: t[`${i}__role`] ?? exp.roleEn,
      locationEn: t[`${i}__location`] ?? exp.locationEn,
      descriptionEn: t[`${i}__description`] ?? exp.descriptionEn,
      subperiods: (exp.subperiods || []).map((sub, j) => ({
        ...sub,
        titleEn: t[`${i}__sub${j}__title`] ?? sub.titleEn,
        descriptionEn: t[`${i}__sub${j}__description`] ?? sub.descriptionEn,
      })),
    }));
  });

  await runSection("academicActivities", "Atividades Acadêmicas", async () => {
    const list = data.academicActivities || [];
    const fields: Record<string, string> = {};
    list.forEach((act, i) => {
      if (act.name) fields[`${i}__name`] = act.name;
      if (act.description) fields[`${i}__description`] = act.description;
      if (act.extraContent) fields[`${i}__extraContent`] = act.extraContent;
    });
    if (Object.keys(fields).length === 0) return;
    const t = await translateFields(fields);
    result.academicActivities = list.map((act, i) => ({
      ...act,
      nameEn: t[`${i}__name`] ?? act.nameEn,
      descriptionEn: t[`${i}__description`] ?? act.descriptionEn,
      extraContentEn: t[`${i}__extraContent`] ?? act.extraContentEn,
    }));
  });

  await runSection("skills", "Habilidades", async () => {
    const fields: Record<string, string> = {};
    data.skills.forEach((skill, i) => {
      if (skill.name) fields[`${i}__name`] = skill.name;
      if (skill.category) fields[`${i}__category`] = skill.category;
    });
    if (Object.keys(fields).length === 0) return;
    const t = await translateFields(fields);
    result.skills = data.skills.map((skill, i) => ({
      ...skill,
      nameEn: t[`${i}__name`] ?? skill.nameEn,
      categoryEn: t[`${i}__category`] ?? skill.categoryEn,
    }));
  });

  await runSection("courses", "Cursos & Certificações", async () => {
    const list = data.courses || [];
    const fields: Record<string, string> = {};
    list.forEach((course, i) => {
      if (course.name) fields[`${i}__name`] = course.name;
      if (course.organization) fields[`${i}__organization`] = course.organization;
      if (course.description) fields[`${i}__description`] = course.description;
    });
    if (Object.keys(fields).length === 0) return;
    const t = await translateFields(fields);
    result.courses = list.map((course, i) => ({
      ...course,
      nameEn: t[`${i}__name`] ?? course.nameEn,
      organizationEn: t[`${i}__organization`] ?? course.organizationEn,
      descriptionEn: t[`${i}__description`] ?? course.descriptionEn,
    }));
  });

  await runSection("categories", "Categorias de Projetos", async () => {
    const fields: Record<string, string> = {};
    data.categories.forEach((cat, i) => {
      if (cat.name) fields[`${i}__name`] = cat.name;
      if (cat.description) fields[`${i}__description`] = cat.description;
    });
    if (Object.keys(fields).length === 0) return;
    const t = await translateFields(fields);
    result.categories = data.categories.map((cat, i) => ({
      ...cat,
      nameEn: t[`${i}__name`] ?? cat.nameEn,
      descriptionEn: t[`${i}__description`] ?? cat.descriptionEn,
    }));
  });

  await runSection("projects", "Projetos (título, resumo, categoria)", async () => {
    const fields: Record<string, string> = {};
    data.projects.forEach((proj, i) => {
      if (proj.title) fields[`${i}__title`] = proj.title;
      if (proj.description) fields[`${i}__description`] = proj.description;
      if (proj.category) fields[`${i}__category`] = proj.category;
    });
    if (Object.keys(fields).length === 0) return;
    const t = await translateFields(fields);
    result.projects = data.projects.map((proj, i) => ({
      ...proj,
      titleEn: t[`${i}__title`] ?? proj.titleEn,
      descriptionEn: t[`${i}__description`] ?? proj.descriptionEn,
      categoryEn: t[`${i}__category`] ?? proj.categoryEn,
    }));
  });

  await runSection("posts", "Posts do Blog (título, resumo, categoria)", async () => {
    const list = data.posts || [];
    const fields: Record<string, string> = {};
    list.forEach((post, i) => {
      if (post.title) fields[`${i}__title`] = post.title;
      if (post.summary) fields[`${i}__summary`] = post.summary;
      if (post.category) fields[`${i}__category`] = post.category;
    });
    if (Object.keys(fields).length === 0) return;
    const t = await translateFields(fields);
    result.posts = list.map((post, i) => ({
      ...post,
      titleEn: t[`${i}__title`] ?? post.titleEn,
      summaryEn: t[`${i}__summary`] ?? post.summaryEn,
      categoryEn: t[`${i}__category`] ?? post.categoryEn,
    }));
  });

  return { data: result, errors };
}
