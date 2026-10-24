import { z } from "zod";
import type { BlogPost, Project } from "../../src/types";
import { findBySlug, slugify, slugOf } from "../../src/utils/slug";
import { estimateReadTime } from "../../src/utils/readTime";

/**
 * Regras de edição dos posts do blog, sem rede nem Supabase — o servidor MCP
 * só lê, chama estas funções e grava. Elas repetem o que o editor do painel
 * (src/pages/PostEditorPage.tsx) faz ao salvar, para um post editado pela IA
 * ficar igual a um editado à mão.
 */

/** Categorias sugeridas no editor, com o nome que o blog mostra em inglês. */
export const POST_CATEGORIES: Record<string, string> = {
  "Física Computacional": "Computational Physics",
  "Instrumentação": "Instrumentation",
  "Ciência dos Materiais": "Materials Science",
  "Geral & Divulgação": "General & Outreach",
};

/** Campos de texto longo que aceitam edição por trecho. */
export const POST_TEXT_FIELDS = ["content", "contentEn", "summary", "summaryEn"] as const;
export type PostTextField = (typeof POST_TEXT_FIELDS)[number];

const text = z.string().max(250000);
const removable = <T extends z.ZodType>(schema: T) => schema.nullable().optional();
const isoDate = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Use AAAA-MM-DD.");

/**
 * O que pode ser alterado num post. `null` remove um campo opcional.
 *
 * Ficam de fora o `id` (fixo), o `tipo` e a `chavePrevia`, que nasce no painel
 * quando alguém pede o link de prévia.
 */
export const postChangesShape = {
  title: text.min(1).optional().describe("Título em português."),
  titleEn: removable(text).describe("Título em inglês."),
  summary: text.optional().describe("Resumo curto (1–2 frases) exibido nos cartões do blog, em português."),
  summaryEn: removable(text).describe("Resumo curto em inglês."),
  content: text.optional().describe(
    "Corpo do post em Markdown (português). Aceita GFM, LaTeX ($...$), blocos de código e imagens `![alt](db:caminho)`.",
  ),
  contentEn: removable(text).describe("Corpo do post em Markdown, em inglês."),
  codigo: z.string().min(1).max(60).optional().describe(
    "Trecho do link (/blog/<codigo>). Ao trocar, o endereço antigo continua funcionando.",
  ),
  date: isoDate.optional().describe("Data de publicação exibida, AAAA-MM-DD."),
  category: z.string().min(1).optional().describe(
    `Categoria. Sugeridas: ${Object.keys(POST_CATEGORIES).join(", ")}. Outras também são aceitas.`,
  ),
  categoryEn: removable(z.string()).describe("Categoria em inglês. Preenchida sozinha para as categorias sugeridas."),
  tags: z.array(z.string()).optional().describe("Temas do post (ex.: 'Python', 'Óptica')."),
  imageUrl: removable(z.string()).describe("Capa: `db:caminho` (de upload_post_image) ou URL https."),
  readTime: removable(z.string()).describe("Tempo de leitura exibido (ex.: '6 min de leitura'). `null` volta a calcular pelo texto."),
  projetos: removable(z.array(z.string())).describe("Códigos dos projetos relacionados, exibidos ao fim do post."),
  references: removable(z.array(z.object({ title: z.string(), url: z.string() }))).describe("Referências citadas."),
  draft: z.boolean().optional().describe("true esconde o post do público; false publica."),
};
export const postChangesSchema = z.object(postChangesShape).strict();
export type PostChanges = z.infer<typeof postChangesSchema>;

function withProtocol(url: string): string {
  const trimmed = url.trim();
  const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!URL.canParse(full)) throw new Error(`Endereço inválido: ${url}`);
  return full;
}

function assertImageRef(ref: string): string {
  const value = ref.trim();
  if (value.startsWith("db:") && value.length > 3) return value;
  if (/^https:\/\//i.test(value) && URL.canParse(value)) return value;
  throw new Error(`Imagem inválida: "${ref}". Use \`db:caminho\` (de upload_post_image) ou uma URL https.`);
}

function cleanList(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** Localiza pelo código, id ou código antigo; o erro sugere os existentes. */
export function findPost(posts: BlogPost[], slug: string): BlogPost {
  const found = findBySlug(posts, slug.trim());
  if (found) return found;
  const known = posts.map((p) => slugOf(p)).join(", ");
  throw new Error(`Post "${slug}" não encontrado. Códigos existentes: ${known || "nenhum"}.`);
}

/** Resumo de uma linha por post, para não devolver o Markdown inteiro. */
export function summarizePost(post: BlogPost) {
  return {
    id: post.id,
    codigo: slugOf(post),
    title: post.title,
    date: post.date,
    category: post.category,
    draft: Boolean(post.draft),
    tags: post.tags,
    projetos: post.projetos ?? [],
    hasEnglish: Boolean(post.titleEn && post.contentEn),
  };
}

export function matchesPostQuery(post: BlogPost, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [post.id, post.codigo, post.title, post.titleEn, post.category, ...(post.tags || []), ...(post.projetos || [])]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

/** Mais recentes primeiro, como no blog. */
export function sortPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export interface ApplyPostResult {
  post: BlogPost;
  changedFields: string[];
}

/**
 * Aplica as alterações sobre uma cópia do post.
 *
 * `others` são os demais posts (para o `codigo` não colidir) e `projects` os
 * projetos existentes (para os relacionados apontarem para algo real). Lança
 * erro com mensagem pronta para a IA corrigir.
 */
export function applyPostChanges(
  post: BlogPost,
  rawChanges: PostChanges,
  others: BlogPost[],
  projects: Project[],
): ApplyPostResult {
  const changes = postChangesSchema.parse(rawChanges);
  const next: Record<string, unknown> = { ...post };

  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || key === "codigo") continue;
    if (value === null) delete next[key];
    else next[key] = value;
  }

  if (typeof next.imageUrl === "string") next.imageUrl = assertImageRef(next.imageUrl);
  if (changes.tags) next.tags = cleanList(changes.tags);
  if (changes.references) {
    next.references = changes.references
      .filter((r) => r.title.trim() || r.url.trim())
      .map((r) => ({ title: r.title.trim(), url: r.url.trim() ? withProtocol(r.url) : "" }));
  }

  // O blog mostra `categoryEn` antes de traduzir `category`: trocar só a
  // categoria em português deixaria a versão em inglês com o nome antigo.
  if (changes.category && changes.categoryEn === undefined) {
    const known = POST_CATEGORIES[changes.category];
    if (known) next.categoryEn = known;
    else delete next.categoryEn;
  }

  if (changes.projetos) {
    const codes = cleanList(changes.projetos);
    const missing = codes.filter((code) => !findBySlug(projects, code));
    if (missing.length) {
      throw new Error(`Projeto inexistente: ${missing.join(", ")}. Use os códigos de list_projects (portfolio-projects).`);
    }
    // Guarda o código atual, que é o que o link do projeto usa.
    next.projetos = codes.map((code) => slugOf(findBySlug(projects, code)!));
  }

  if (changes.codigo !== undefined) {
    const codigo = slugify(changes.codigo);
    if (!codigo) throw new Error("O código precisa ter letras ou números.");
    const reserved = others.flatMap((p) => [p.codigo, p.id]).filter(Boolean);
    if (reserved.includes(codigo)) throw new Error(`Outro post já usa o código "${codigo}".`);
    // Renomear guarda o endereço anterior: o link antigo já pode ter circulado.
    const previous = post.codigo;
    const history = cleanList([...(post.codigosAntigos || []), ...(previous && previous !== codigo ? [previous] : [])]).filter(
      (old) => old !== codigo,
    );
    next.codigo = codigo;
    if (history.length) next.codigosAntigos = history;
    else delete next.codigosAntigos;
  }

  const original = post as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(original), ...Object.keys(next)]);
  const changedFields = [...keys].filter((key) => JSON.stringify(original[key]) !== JSON.stringify(next[key]));
  return { post: next as unknown as BlogPost, changedFields };
}

export interface NewPostInput extends PostChanges {
  title: string;
}

/**
 * Monta um post novo. Nasce como rascunho, a não ser que `draft: false` venha
 * explícito — publicar é decisão de quem pediu, não padrão.
 */
export function buildNewPost(input: NewPostInput, existing: BlogPost[], projects: Project[], now = new Date()): BlogPost {
  const base: BlogPost = {
    id: `post-${now.getTime()}`,
    title: input.title,
    summary: "",
    content: "",
    date: now.toISOString().split("T")[0],
    tags: [],
    references: [],
    category: "Instrumentação",
    categoryEn: "Instrumentation",
    draft: true,
  };
  const { post } = applyPostChanges(base, { ...input, codigo: input.codigo || input.title }, existing, projects);
  return post;
}

/** Tempo de leitura que o site mostra: o informado ou o calculado pelo texto. */
export function readTimeOf(post: BlogPost) {
  return {
    pt: post.readTime?.trim() || estimateReadTime(post.content || "", "pt"),
    en: post.readTime?.trim() || estimateReadTime(post.contentEn || post.content || "", "en"),
  };
}
