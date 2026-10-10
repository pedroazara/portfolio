import { z } from "zod";
import type { Project, ProjectCategory } from "../../src/types";
import { findBySlug, slugify, slugOf } from "../../src/utils/slug";

/**
 * Regras de edição de projetos, sem rede nem Supabase — o servidor MCP só
 * lê, chama estas funções e grava. Elas repetem o que o formulário do painel
 * (src/components/ProjectForm.tsx) faz ao salvar, para um projeto editado pela
 * IA ficar igual a um editado à mão.
 */

/** Estado exibido na ficha do projeto. */
export const SITUACOES = ["planejamento", "andamento", "concluido"] as const;
export type Situacao = (typeof SITUACOES)[number];

/** Campos de texto longo que aceitam edição por trecho. */
export const TEXT_FIELDS = [
  "detailedDescription",
  "detailedDescriptionEn",
  "description",
  "descriptionEn",
  "scientificRelevance",
  "scientificRelevanceEn",
] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

const text = z.string().max(250000);
const removable = <T extends z.ZodType>(schema: T) => schema.nullable().optional();
const yearMonth = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, "Use AAAA ou AAAA-MM.");

/**
 * O que pode ser alterado num projeto. `null` remove um campo opcional.
 *
 * Ficam de fora o `id` (fixo), o histórico de endereços (mantido sozinho ao
 * trocar o `codigo`) e `status`/`emAndamento`/`emPlanejamento`, que andam
 * juntos e por isso só mudam pela `situacao`.
 */
export const projectChangesShape = {
  title: text.min(1).optional().describe("Título em português."),
  titleEn: removable(text).describe("Título em inglês."),
  description: text.optional().describe("Resumo curto (1–2 frases) exibido nos cartões, em português."),
  descriptionEn: removable(text).describe("Resumo curto em inglês."),
  detailedDescription: removable(text).describe(
    "Corpo da página do projeto em Markdown (português). Aceita GFM, LaTeX ($...$) e imagens `![alt](db:caminho)`.",
  ),
  detailedDescriptionEn: removable(text).describe("Corpo da página em Markdown, em inglês."),
  scientificRelevance: removable(text).describe("Seção 'Relevância técnica e científica' em Markdown (português)."),
  scientificRelevanceEn: removable(text).describe("Seção de relevância em inglês."),
  codigo: z.string().min(1).max(60).optional().describe(
    "Trecho do link (/projetos/<codigo>). Ao trocar, o endereço antigo continua funcionando.",
  ),
  categoryIds: z.array(z.string()).min(1).optional().describe("IDs de categoria (veja list_categories). A primeira é a principal."),
  tags: z.array(z.string()).optional().describe("Temas do projeto (ex.: 'Visão Computacional')."),
  stack: removable(z.array(z.string())).describe("Ferramentas e tecnologias (ex.: 'Python', 'OpenCV')."),
  highlights: removable(z.array(z.string())).describe("Destaques curtos em português."),
  highlightsEn: removable(z.array(z.string())).describe("Destaques curtos em inglês."),
  githubUrl: removable(z.string()).describe("Repositório."),
  projectUrl: removable(z.string()).describe("Demonstração ou site do projeto."),
  documentationUrl: removable(z.string()).describe("Documentação."),
  paperUrl: removable(z.string()).describe("Artigo ou publicação."),
  imageUrl: removable(z.string()).describe("Capa: `db:caminho` (de upload_project_image) ou URL https."),
  galleryImages: z.array(z.string()).optional().describe("Galeria: lista de `db:caminho` ou URLs https, na ordem de exibição."),
  galleryCaptions: removable(z.record(z.string(), z.string())).describe("Legendas PT, por referência da imagem."),
  galleryCaptionsEn: removable(z.record(z.string(), z.string())).describe("Legendas EN, por referência da imagem."),
  periodo: removable(z.object({ inicio: yearMonth, fim: yearMonth.optional() })).describe(
    "Período: { inicio: 'AAAA-MM', fim?: 'AAAA-MM' }. Sem `fim`, a página mostra 'Presente'.",
  ),
  situacao: z.enum(SITUACOES).optional().describe("planejamento | andamento | concluido."),
  featured: z.boolean().optional().describe("Aparece entre os projetos em destaque."),
  draft: z.boolean().optional().describe("true esconde o projeto do público; false publica."),
  references: removable(z.array(z.object({ title: z.string(), url: z.string() }))).describe("Referências citadas."),
  blogPostId: removable(z.string()).describe("ID de um post do blog relacionado."),
};
export const projectChangesSchema = z.object(projectChangesShape).strict();
export type ProjectChanges = z.infer<typeof projectChangesSchema>;

const URL_FIELDS = ["githubUrl", "projectUrl", "documentationUrl", "paperUrl"] as const;

/** Mesmo comportamento do formulário: "github.com/x" vira "https://github.com/x". */
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
  throw new Error(`Imagem inválida: "${ref}". Use \`db:caminho\` (de upload_project_image) ou uma URL https.`);
}

function cleanList(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** Rótulo curto do estado, para listagens. */
export function situacaoOf(project: Project): string {
  const status = project.status || "";
  if (project.emAndamento || ["Em andamento", "em_andamento", "In Progress"].includes(status)) return "andamento";
  if (project.emPlanejamento || ["Em planejamento", "Planning"].includes(status)) return "planejamento";
  return status || "concluido";
}

/** Formas de escrever o mesmo repositório: https, ssh, com ou sem `.git`. */
export function normalizeRepoUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^git@([^:]+):/, "$1/")
    .replace(/^[a-z+]+:\/\//, "")
    .replace(/^[^@/]+@/, "")
    .replace(/^www\./, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}

/** Localiza pelo código, id ou código antigo; o erro sugere os existentes. */
export function findProject(projects: Project[], slug: string): Project {
  const found = findBySlug(projects, slug.trim());
  if (found) return found;
  const known = projects.map((p) => slugOf(p)).join(", ");
  throw new Error(`Projeto "${slug}" não encontrado. Códigos existentes: ${known || "nenhum"}.`);
}

export function findProjectByRepo(projects: Project[], repoUrl: string): Project | null {
  const target = normalizeRepoUrl(repoUrl);
  return projects.find((p) => p.githubUrl && normalizeRepoUrl(p.githubUrl) === target) || null;
}

/** Resumo de uma linha por projeto, para não devolver o Markdown inteiro. */
export function summarizeProject(project: Project) {
  return {
    id: project.id,
    codigo: slugOf(project),
    title: project.title,
    situacao: situacaoOf(project),
    draft: Boolean(project.draft),
    featured: Boolean(project.featured),
    categoryIds: project.categoryIds?.length ? project.categoryIds : [project.categoryId].filter(Boolean),
    githubUrl: project.githubUrl,
    hasEnglish: Boolean(project.titleEn && project.descriptionEn),
  };
}

export function matchesQuery(project: Project, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [project.id, project.codigo, project.title, project.titleEn, project.githubUrl, ...(project.tags || []), ...(project.stack || [])]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

export interface ApplyResult {
  project: Project;
  changedFields: string[];
}

/**
 * Aplica as alterações sobre uma cópia do projeto.
 *
 * `others` são os demais projetos (para o `codigo` não colidir) e `categories`
 * as categorias existentes. Lança erro com mensagem pronta para a IA corrigir.
 */
export function applyProjectChanges(
  project: Project,
  rawChanges: ProjectChanges,
  others: Project[],
  categories: ProjectCategory[],
): ApplyResult {
  const changes = projectChangesSchema.parse(rawChanges);
  const next: Record<string, unknown> = { ...project };

  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || key === "situacao" || key === "codigo") continue;
    if (value === null) delete next[key];
    else next[key] = value;
  }

  for (const field of URL_FIELDS) {
    if (typeof next[field] === "string") next[field] = withProtocol(next[field] as string);
  }
  if (typeof next.imageUrl === "string") next.imageUrl = assertImageRef(next.imageUrl);
  if (changes.galleryImages) next.galleryImages = cleanList(changes.galleryImages).map(assertImageRef);
  if (changes.tags) next.tags = cleanList(changes.tags);
  if (changes.stack) next.stack = cleanList(changes.stack);
  if (changes.references) {
    next.references = changes.references
      .filter((r) => r.title.trim() || r.url.trim())
      .map((r) => ({ title: r.title.trim(), url: r.url.trim() ? withProtocol(r.url) : "" }));
  }

  if (changes.categoryIds) {
    const ids = cleanList(changes.categoryIds);
    const missing = ids.filter((id) => !categories.some((c) => c.id === id));
    if (missing.length) {
      throw new Error(`Categoria inexistente: ${missing.join(", ")}. Disponíveis: ${categories.map((c) => c.id).join(", ")}.`);
    }
    next.categoryIds = ids;
    next.categoryId = ids[0];
  }

  if (changes.situacao) {
    next.emAndamento = changes.situacao === "andamento";
    next.emPlanejamento = changes.situacao === "planejamento";
    next.status = { andamento: "Em andamento", planejamento: "Em planejamento", concluido: "Concluído" }[changes.situacao];
  }

  if (changes.codigo !== undefined) {
    const codigo = slugify(changes.codigo);
    if (!codigo) throw new Error("O código precisa ter letras ou números.");
    const reserved = others.flatMap((p) => [p.codigo, p.id]).filter(Boolean);
    if (reserved.includes(codigo)) throw new Error(`Outro projeto já usa o código "${codigo}".`);
    // Renomear guarda o endereço anterior, como no painel: o link antigo já circulou.
    const previous = project.codigo;
    const history = cleanList([...(project.codigosAntigos || []), ...(previous && previous !== codigo ? [previous] : [])]).filter(
      (old) => old !== codigo,
    );
    next.codigo = codigo;
    if (history.length) next.codigosAntigos = history;
    else delete next.codigosAntigos;
  }

  const original = project as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(original), ...Object.keys(next)]);
  const changedFields = [...keys].filter((key) => JSON.stringify(original[key]) !== JSON.stringify(next[key]));
  return { project: next as unknown as Project, changedFields };
}

export interface NewProjectInput extends ProjectChanges {
  title: string;
}

/**
 * Monta um projeto novo. Nasce como rascunho, a não ser que `draft: false`
 * venha explícito — publicar é decisão de quem pediu, não padrão.
 */
export function buildNewProject(
  input: NewProjectInput,
  existing: Project[],
  categories: ProjectCategory[],
  now = Date.now(),
): Project {
  const base: Project = {
    id: `proj-${now}`,
    tipo: "projeto",
    title: input.title,
    description: "",
    categoryId: categories[0]?.id || "",
    categoryIds: categories[0] ? [categories[0].id] : [],
    tags: [],
    galleryImages: [],
    featured: false,
    draft: true,
  };
  const { project } = applyProjectChanges(
    base,
    { situacao: "andamento", ...input, codigo: input.codigo || input.title },
    existing,
    categories,
  );
  return project;
}

/**
 * Troca um trecho exato de um texto, ou acrescenta ao fim quando `oldText`
 * não vem. Exigir trecho único evita trocar o lugar errado sem perceber.
 */
export function editText(current: string | undefined, newText: string, oldText?: string): string {
  const body = current || "";
  if (oldText === undefined || oldText === "") {
    return body.trim() ? `${body.replace(/\s+$/, "")}\n\n${newText.replace(/^\s+/, "")}` : newText;
  }
  const count = body.split(oldText).length - 1;
  if (count === 0) throw new Error("Trecho não encontrado. Leia o projeto com get_project e copie o trecho exato.");
  if (count > 1) throw new Error(`O trecho aparece ${count} vezes. Inclua mais contexto para ele ser único.`);
  return body.replace(oldText, () => newText);
}

/** Primeiros caracteres de um valor, para prévias de alteração. */
export function preview(value: unknown, max = 200): unknown {
  if (value === undefined) return null;
  const json = typeof value === "string" ? value : JSON.stringify(value);
  return json.length > max ? `${json.slice(0, max)}… (${json.length} caracteres)` : value;
}
