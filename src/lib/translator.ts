/**
 * Utility functions for Gemini AI Auto-Translation API
 *
 * Translation always goes through the `/api/translate` serverless function —
 * the Gemini API key lives only in the server environment (GEMINI_API_KEY)
 * and is never bundled into client-side JS. There is intentionally no
 * client-side fallback that calls Gemini directly: that would require
 * exposing the API key via a VITE_-prefixed env var, letting anyone extract
 * it from the deployed bundle and run up usage on it.
 */
import { ResumeData } from "../types";

export interface TranslationResponse {
  translations?: Record<string, string>;
  translation?: string;
  error?: string;
}

/**
 * Translates a single string from Portuguese to English using Gemini AI API.
 */
export async function translateText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "";

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok || !contentType.includes("application/json")) {
    throw new Error(
      "Serviço de tradução indisponível. Verifique se a variável GEMINI_API_KEY está configurada no servidor (Vercel -> Settings -> Environment Variables)."
    );
  }

  const data: TranslationResponse = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data.translation || "";
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

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: validFields }),
  });

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok || !contentType.includes("application/json")) {
    const errData = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
    throw new Error(
      errData.error ||
        "Serviço de tradução indisponível. Verifique se a variável GEMINI_API_KEY está configurada no servidor (Vercel -> Settings -> Environment Variables)."
    );
  }

  const data: TranslationResponse = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return (data.translations as Partial<T>) || {};
}

/**
 * Shared body behind every per-item "Traduzir PT → EN" button in the admin
 * editors: translates `fieldsToTranslate` (keyed by the target English field
 * name, e.g. `{ roleEn: expForm.role }`) and merges the result back into form
 * state, falling back to whatever was already there for any field the API
 * didn't return.
 */
export async function autoTranslateFields<F, T extends Record<string, string>>(
  fieldsToTranslate: T,
  setForm: (updater: (prev: F) => F) => void
): Promise<void> {
  const translated = await translateFields(fieldsToTranslate);
  setForm((prev) => {
    const next: any = { ...prev };
    for (const key of Object.keys(fieldsToTranslate)) {
      next[key] = (translated as any)[key] || (prev as any)[key] || "";
    }
    return next as F;
  });
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
  onStepChange?: (key: string, status: TranslateAllStep["status"], error?: string) => void,
  selectedKeys?: Set<string>
): Promise<TranslateAllResult> {
  const result: ResumeData = { ...data };
  const errors: { section: string; message: string }[] = [];

  const runSection = async (key: string, label: string, task: () => Promise<void>) => {
    if (selectedKeys && !selectedKeys.has(key)) return;
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
    const skillCategories = data.skillCategories || [];
    const fields: Record<string, string> = {};
    data.skills.forEach((skill, i) => {
      if (skill.name) fields[`skill${i}__name`] = skill.name;
      if (skill.category) fields[`skill${i}__category`] = skill.category;
    });
    skillCategories.forEach((cat, i) => {
      if (cat.name) fields[`cat${i}__name`] = cat.name;
    });
    if (Object.keys(fields).length === 0) return;
    const t = await translateFields(fields);
    result.skills = data.skills.map((skill, i) => ({
      ...skill,
      nameEn: t[`skill${i}__name`] ?? skill.nameEn,
      categoryEn: t[`skill${i}__category`] ?? skill.categoryEn,
    }));
    result.skillCategories = skillCategories.map((cat, i) => ({
      ...cat,
      nameEn: t[`cat${i}__name`] ?? cat.nameEn,
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
