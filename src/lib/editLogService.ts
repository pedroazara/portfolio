import { isDevPreview } from "./devPreview";
import { isSupabaseConfigured, supabase } from "./supabase";

/**
 * Registro de edições do portfólio (supabase/edit_log.sql): quem mudou o quê.
 *
 * Um gatilho no banco anota cada gravação. A autoria vem da requisição: os
 * servidores MCP (mcp/) se identificam; o painel não, e vira "você".
 */

export interface EditChange {
  collection: string;
  id?: string;
  slug?: string | null;
  label?: string;
  action: string;
  fields?: string[];
  /** Caminho anterior de uma imagem movida ou editada. */
  from?: string;
}

export interface EditLogEntry {
  id: number;
  created_at: string;
  updated_at: string;
  source: "painel" | "agente" | "sistema";
  agent: string | null;
  session: string | null;
  tool: string | null;
  note: string | null;
  changes: EditChange[];
  /** Gravações seguidas do painel reunidas nesta linha. */
  saves: number;
}

export type AuthorKind = "voce" | "agente" | "sistema";

export interface EditAuthor {
  key: string;
  kind: AuthorKind;
  label: string;
  detail: string;
}

const CLIENT_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  "claude-ai": "Claude Desktop",
  cursor: "Cursor",
  "mcp-inspector": "MCP Inspector",
};

/** Quem fez a edição. Agentes se agrupam pelo cliente, sem a versão. */
export function authorOf(entry: Pick<EditLogEntry, "source" | "agent">): EditAuthor {
  if (entry.source === "painel") return { key: "voce", kind: "voce", label: "Você", detail: "pelo painel do site" };
  if (entry.source === "sistema") return { key: "sistema", kind: "sistema", label: "Sistema", detail: "scripts ou SQL Editor" };
  const agent = entry.agent?.trim() || "Agente";
  const [client, server] = agent.split(" · ");
  // "claude-code 2.1.0" → "claude-code"; um nome definido à mão fica inteiro.
  const name = server ? client.split(" ")[0] : client;
  return { key: `agente:${name}`, kind: "agente", label: CLIENT_NAMES[name] ?? name, detail: agent };
}

export interface AuthorSummary {
  author: EditAuthor;
  edits: number;
  saves: number;
  sessions: number;
  tools: string[];
  lastAt: string;
}

/** Totais por autor, do mais recente para o mais antigo. */
export function summarizeAuthors(entries: EditLogEntry[]): AuthorSummary[] {
  const byKey = new Map<string, AuthorSummary & { sessionSet: Set<string>; toolSet: Set<string> }>();
  for (const entry of entries) {
    const author = authorOf(entry);
    const current = byKey.get(author.key) ?? {
      author,
      edits: 0,
      saves: 0,
      sessions: 0,
      tools: [],
      lastAt: entry.updated_at,
      sessionSet: new Set<string>(),
      toolSet: new Set<string>(),
    };
    current.edits += 1;
    current.saves += entry.saves || 1;
    if (entry.session) current.sessionSet.add(entry.session);
    if (entry.tool) current.toolSet.add(entry.tool);
    if (entry.updated_at > current.lastAt) current.lastAt = entry.updated_at;
    byKey.set(author.key, current);
  }
  return [...byKey.values()]
    .map(({ sessionSet, toolSet, ...summary }) => ({ ...summary, sessions: sessionSet.size, tools: [...toolSet].sort() }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** Nome de cada coleção do documento: singular e plural. */
const COLLECTIONS: Record<string, [string, string]> = {
  projects: ["projeto", "projetos"],
  posts: ["post", "posts"],
  experiences: ["experiência", "experiências"],
  academicActivities: ["atividade", "atividades"],
  educations: ["formação", "formações"],
  skills: ["habilidade", "habilidades"],
  skillCategories: ["grupo de habilidades", "grupos de habilidades"],
  courses: ["curso", "cursos"],
  categories: ["categoria", "categorias"],
  profile: ["perfil", "perfil"],
  images: ["imagem", "imagens"],
};

const ACTIONS: Record<string, string> = {
  criado: "criou",
  alterado: "alterou",
  removido: "removeu",
  reordenado: "reordenou",
  enviado: "enviou",
  editado: "editou",
  recortado: "recortou a capa de",
  movido: "moveu",
  apagado: "apagou",
};

const FIELDS: Record<string, string> = {
  title: "título",
  titleEn: "título (EN)",
  description: "resumo",
  descriptionEn: "resumo (EN)",
  summary: "resumo",
  summaryEn: "resumo (EN)",
  detailedDescription: "texto da página",
  detailedDescriptionEn: "texto da página (EN)",
  content: "texto",
  contentEn: "texto (EN)",
  scientificRelevance: "relevância",
  scientificRelevanceEn: "relevância (EN)",
  imageUrl: "capa",
  galleryImages: "galeria",
  galleryCaptions: "legendas",
  galleryCaptionsEn: "legendas (EN)",
  tags: "tags",
  stack: "tecnologias",
  codigo: "endereço",
  codigosAntigos: "endereços antigos",
  draft: "publicação",
  featured: "destaque",
  emAndamento: "situação",
  emPlanejamento: "situação",
  status: "situação",
  categoryId: "categorias",
  categoryIds: "categorias",
  githubUrl: "repositório",
  projectUrl: "demonstração",
  periodo: "período",
  references: "referências",
  highlights: "destaques",
  highlightsEn: "destaques (EN)",
  avatarUrl: "foto",
  badgeIconUrl: "ícone",
  bio: "bio",
  bioEn: "bio (EN)",
};

/** Nomes legíveis dos campos, sem repetir (situação junta três campos). */
export function fieldLabels(fields: string[] = []): string[] {
  return [...new Set(fields.map((field) => FIELDS[field] ?? field))];
}

/** "alterou o Projeto “YOLOcraft”" — sem os campos, que a interface lista à parte. */
export function describeChange(change: EditChange): string {
  const verb = ACTIONS[change.action] ?? change.action;
  const [singular, plural] = COLLECTIONS[change.collection] ?? [change.collection, change.collection];
  if (change.action === "reordenado") return `${verb} a lista de ${plural}`;
  if (change.collection === "images") return `${verb} ${change.id ?? "imagem"}`;
  const name = change.label && change.label !== change.id ? `“${change.label}”` : change.id ?? "";
  return `${verb} ${singular} ${name}`.trim();
}

/** Página pública do item alterado, quando houver uma. */
export function changeLink(change: EditChange): string | null {
  if (change.action === "removido" || !change.id) return null;
  const slug = encodeURIComponent(change.slug || change.id);
  if (change.collection === "projects") return `/projetos/${slug}`;
  if (change.collection === "posts") return `/blog/${slug}`;
  return null;
}

export class EditLogUnavailableError extends Error {
  constructor() {
    super("O registro de edições ainda não foi ativado. Rode supabase/edit_log.sql no SQL Editor do Supabase.");
    this.name = "EditLogUnavailableError";
  }
}

/** Exemplo do modo de teste local (/?dev), para a aba não ficar vazia. */
function sampleEntries(): EditLogEntry[] {
  const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60000).toISOString();
  return [
    {
      id: 3, created_at: at(12), updated_at: at(12), source: "agente",
      agent: "claude-code 2.1.0 · portfolio-projects", session: "notebook·a1b2c3", tool: "edit_project_text",
      note: "Acrescenta os resultados do novo treino.", saves: 1,
      changes: [{ collection: "projects", id: "proj-yolocraft", slug: "yolocraft", label: "YOLOcraft", action: "alterado", fields: ["detailedDescription"] }],
    },
    {
      id: 2, created_at: at(15), updated_at: at(15), source: "agente",
      agent: "claude-code 2.1.0 · portfolio-media", session: "notebook·a1b2c3", tool: "upload_image", note: null, saves: 1,
      changes: [{ collection: "images", id: "projects/yolocraft/curva-pr.webp", action: "enviado" }],
    },
    {
      id: 1, created_at: at(180), updated_at: at(150), source: "painel", agent: null, session: null, tool: null, note: null, saves: 7,
      changes: [{ collection: "projects", id: "proj-yolocraft", slug: "yolocraft", label: "YOLOcraft", action: "alterado", fields: ["title", "tags"] }],
    },
  ];
}

export async function fetchEditLog(limit = 300): Promise<EditLogEntry[]> {
  if (isDevPreview()) return sampleEntries();
  if (!isSupabaseConfigured) throw new Error("Supabase não configurado.");
  const { data, error } = await supabase
    .from("portfolio_edit_log")
    .select("id,created_at,updated_at,source,agent,session,tool,note,changes,saves")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") throw new EditLogUnavailableError();
    throw new Error(`Não foi possível carregar o registro: ${error.message}`);
  }
  return (data ?? []) as EditLogEntry[];
}
