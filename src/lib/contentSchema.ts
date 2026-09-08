import { z } from "zod";
import type { ResumeData, Project } from "../types";

const text = z.string().max(250000);
const strings = z.array(text).max(2000);
const item = z.object({ id: z.string().min(1).max(200) }).passthrough();
const link = z.object({ title: text, url: text }).passthrough();
export const projectSchema = item.extend({
  title: text, description: text.default(""), categoryId: text.default(""), tags: strings.default([]),
  codigo: text.optional(), categoryIds: strings.optional(), imageUrl: text.optional(),
  githubUrl: text.optional(), projectUrl: text.optional(), galleryImages: strings.optional(),
  detailedDescription: text.optional(), featured: z.boolean().optional(), draft: z.boolean().optional(),
  emAndamento: z.boolean().optional(), emPlanejamento: z.boolean().optional(),
  references: z.array(link).optional(), stack: strings.optional(),
});
export const postSchema = item.extend({ title: text, summary: text.default(""), content: text.default(""), date: text, tags: strings.default([]), draft: z.boolean().optional() });
const schema = z.object({
  profile: z.object({ name: text, title: text, bio: text, email: text, phone: text.default(""), location: text.default("") }).passthrough(),
  categories: z.array(item.extend({ name: text })).max(1000),
  projects: z.array(projectSchema).max(2000),
  experiences: z.array(item.extend({ company: text, role: text, description: text, startDate: text, current: z.boolean() })).max(2000),
  educations: z.array(item.extend({ institution: text, degree: text, fieldOfStudy: text, startDate: text, endDate: text.default(""), current: z.boolean() })).max(2000),
  skills: z.array(item.extend({ name: text, category: text, level: z.number().min(0).max(5) })).max(2000),
  academicActivities: z.array(item.extend({ name: text, startDate: text.default(""), description: text.default("") })).default([]),
  skillCategories: z.array(item.extend({ name: text })).default([]),
  courses: z.array(item.extend({ name: text, organization: text, issueDate: text })).default([]),
  posts: z.array(postSchema).max(2000).default([]),
}).passthrough();

export function normalizeProject(input: Record<string, any>): Project {
  const p = { ...input };
  const aliases: Record<string, string[]> = {
    githubUrl: ["repositoryUrl", "repositorio"], projectUrl: ["demo", "liveUrl", "demoUrl", "link"],
    galleryImages: ["images"], stack: ["technologies"], detailedDescription: ["longDescription"], detailedDescriptionEn: ["longDescriptionEn"], featured: ["destaque"],
  };
  for (const [canonical, oldKeys] of Object.entries(aliases)) {
    if (p[canonical] == null || p[canonical] === "" || Array.isArray(p[canonical]) && !p[canonical].length) {
      const old = oldKeys.find(k => p[k] != null && p[k] !== "");
      if (old) p[canonical] = p[old];
    }
    oldKeys.forEach(k => delete p[k]);
  }
  return projectSchema.parse(p) as Project;
}

export function parseResumeData(value: unknown): ResumeData {
  // Reject prototype keys and executable URL schemes even in extension fields.
  const inspect = (node: unknown, depth = 0) => {
    if (depth > 30) throw new Error("Documento muito aninhado.");
    if (typeof node === "string" && /^\s*(javascript|vbscript):/i.test(node)) throw new Error("URL insegura no documento.");
    if (node && typeof node === "object") for (const [key, v] of Object.entries(node)) {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Campo inválido no documento.");
      inspect(v, depth + 1);
    }
  };
  inspect(value);
  const parsed = schema.parse(value);
  for (const key of ["projects", "posts", "categories", "experiences", "educations", "skills"] as const) {
    const ids = parsed[key].map(v => v.id);
    if (new Set(ids).size !== ids.length) throw new Error(`Identificadores repetidos em ${key}.`);
  }
  return { ...parsed, projects: parsed.projects.map(normalizeProject) } as ResumeData;
}
