import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { BlogPost } from "../../src/types";
import { findBySlug, slugOf } from "../../src/utils/slug";
import { logFileEdit, noteParam, trackClient, type FileChange } from "../core/editLog";
import { SITE_URL } from "../core/env";
import { uploadImage } from "../core/images";
import { listBackups, readBackup, readPortfolio, updatePortfolio } from "../core/portfolioDocument";
import { reply } from "../core/reply";
import { editText, preview } from "../projects/projectOps";
import {
  POST_CATEGORIES,
  POST_TEXT_FIELDS,
  applyPostChanges,
  buildNewPost,
  findPost,
  matchesPostQuery,
  postChangesShape,
  readTimeOf,
  sortPosts,
  summarizePost,
  type NewPostInput,
  type PostChanges,
} from "./blogOps";

/**
 * Servidor MCP "portfolio-blog": deixa uma IA ler e editar os posts do blog
 * do portfólio. Roda localmente, falando com o cliente por stdio.
 */

const INSTRUCTIONS = `Edita os posts do blog do portfólio pessoal (${SITE_URL}/blog).
Os dados ficam no Supabase, no mesmo documento que o painel do site edita.

Regras:
- Leia o post com get_post antes de editar.
- O site é bilíngue. Ao alterar um campo em português, atualize o equivalente em inglês (titleEn, summaryEn, contentEn).
- Para mudanças pontuais no corpo do post, prefira edit_post_text a reenviar o Markdown inteiro.
- Imagens: upload_post_image devolve uma referência "db:..."; no Markdown use ![descrição](db:...).
- Categorias sugeridas: ${Object.keys(POST_CATEGORIES).join(", ")}.
- Projetos relacionados (projetos) usam os códigos de list_projects do servidor portfolio-projects.
- Posts novos nascem como rascunho (draft: true). Só publique (draft: false) quando o usuário pedir.
- Use dryRun: true para mostrar o que mudaria antes de alterações grandes.
- Cada gravação guarda localmente uma cópia do documento anterior (campo backupPath). Para desfazer, use restore_post com essa cópia.`;

const server = new McpServer({ name: "portfolio-blog", version: "0.1.0" }, { instructions: INSTRUCTIONS });
trackClient(server, "portfolio-blog");

function links(post: BlogPost) {
  const slug = encodeURIComponent(slugOf(post));
  const previa = post.draft && post.chavePrevia ? `?previa=${encodeURIComponent(post.chavePrevia)}` : "";
  return {
    page: `${SITE_URL}/blog/${slug}${previa}`,
    editor: `${SITE_URL}/admin/posts/${slug}`,
  };
}

/** Resposta padrão das ferramentas que gravam. */
function writeSummary(
  outcome: { written: boolean; backupPath?: string },
  post: BlogPost,
  before: BlogPost | null,
  changedFields: string[],
  dryRun: boolean,
) {
  const changes = Object.fromEntries(
    changedFields.map((field) => [
      field,
      {
        before: preview(before ? (before as unknown as Record<string, unknown>)[field] : undefined),
        after: preview((post as unknown as Record<string, unknown>)[field]),
      },
    ]),
  );
  return {
    status: dryRun ? "simulação — nada foi gravado" : outcome.written ? "gravado" : "sem alterações",
    post: summarizePost(post),
    links: links(post),
    changes,
    backupPath: outcome.backupPath,
  };
}

const slugParam = z.string().min(1).describe("Código do post (o trecho do link), id ou código antigo.");
const dryRunParam = z.boolean().optional().describe("true mostra o que mudaria, sem gravar.");

server.registerTool(
  "list_posts",
  {
    title: "Listar posts",
    description: "Lista os posts do blog em resumo (código, título, data, categoria, rascunho), dos mais recentes aos mais antigos.",
    inputSchema: {
      query: z.string().optional().describe("Filtra por título, código, categoria, tags ou projeto relacionado."),
      includeDrafts: z.boolean().optional().describe("Incluir rascunhos (padrão: true)."),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ query, includeDrafts = true }) => {
    const { data } = await readPortfolio();
    const posts = sortPosts(data.posts ?? [])
      .filter((p) => includeDrafts || !p.draft)
      .filter((p) => matchesPostQuery(p, query || ""))
      .map(summarizePost);
    return reply({ total: posts.length, posts });
  },
);

server.registerTool(
  "get_post",
  {
    title: "Ler post",
    description: "Devolve o post completo (todos os campos, incluindo o Markdown), o tempo de leitura exibido e os links da página e do editor.",
    inputSchema: { slug: slugParam },
    annotations: { readOnlyHint: true },
  },
  async ({ slug }) => {
    const { data } = await readPortfolio();
    const post = findPost(data.posts ?? [], slug);
    return reply({ post, readTime: readTimeOf(post), links: links(post) });
  },
);

server.registerTool(
  "create_post",
  {
    title: "Criar post",
    description:
      "Cria um post novo no blog. Nasce como rascunho, com a data de hoje, a não ser que `draft`/`date` digam o contrário. " +
      "O `codigo` sai do título quando não é informado.",
    inputSchema: {
      ...postChangesShape,
      title: z.string().min(1).describe("Título em português."),
      note: noteParam,
      dryRun: dryRunParam,
    },
    annotations: { destructiveHint: false },
  },
  async ({ dryRun = false, note, ...input }) => {
    const outcome = await updatePortfolio(
      { tool: "create_post", target: input.codigo || input.title, note },
      (doc) => {
        const post = buildNewPost(input as NewPostInput, doc.posts ?? [], doc.projects);
        // Como no editor: o post novo entra no topo da lista.
        doc.posts = [post, ...(doc.posts ?? [])];
        return { result: post, changed: true };
      },
      { dryRun },
    );
    const post = outcome.result;
    return reply(writeSummary(outcome, post, null, Object.keys(post), dryRun));
  },
);

server.registerTool(
  "update_post",
  {
    title: "Atualizar post",
    description:
      "Altera campos de um post. Só os campos enviados mudam; `null` remove um campo opcional. " +
      "Listas (tags, projetos, references) são substituídas inteiras.",
    inputSchema: {
      slug: slugParam,
      changes: z.object(postChangesShape).strict().describe("Campos a alterar."),
      note: noteParam,
      dryRun: dryRunParam,
    },
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  async ({ slug, changes, note, dryRun = false }) => {
    let before: BlogPost | null = null;
    const outcome = await updatePortfolio(
      { tool: "update_post", target: slug, note },
      (doc) => {
        const posts = doc.posts ?? [];
        const current = findPost(posts, slug);
        before = current;
        const others = posts.filter((p) => p.id !== current.id);
        const applied = applyPostChanges(current, changes as PostChanges, others, doc.projects);
        doc.posts = posts.map((p) => (p.id === current.id ? applied.post : p));
        return { result: applied, changed: applied.changedFields.length > 0 };
      },
      { dryRun },
    );
    return reply(writeSummary(outcome, outcome.result.post, before, outcome.result.changedFields, dryRun));
  },
);

server.registerTool(
  "edit_post_text",
  {
    title: "Editar trecho do post",
    description:
      "Troca um trecho exato de um campo de texto (como o Markdown do post) por outro, sem reenviar o texto inteiro. " +
      "Sem `oldText`, acrescenta `newText` ao fim do campo.",
    inputSchema: {
      slug: slugParam,
      field: z.enum(POST_TEXT_FIELDS).describe("Campo a editar. O corpo do post é content (PT) / contentEn (EN)."),
      oldText: z.string().optional().describe("Trecho atual, copiado exatamente. Precisa aparecer uma única vez."),
      newText: z.string().describe("Texto que entra no lugar (ou ao fim, sem oldText)."),
      note: noteParam,
      dryRun: dryRunParam,
    },
    annotations: { destructiveHint: true },
  },
  async ({ slug, field, oldText, newText, note, dryRun = false }) => {
    let before: BlogPost | null = null;
    const outcome = await updatePortfolio(
      { tool: "edit_post_text", target: `${slug}-${field}`, note },
      (doc) => {
        const posts = doc.posts ?? [];
        const current = findPost(posts, slug);
        before = current;
        const updated = { ...current, [field]: editText(current[field], newText, oldText, "Leia o post com get_post") };
        doc.posts = posts.map((p) => (p.id === current.id ? updated : p));
        return { result: updated, changed: updated[field] !== current[field] };
      },
      { dryRun },
    );
    return reply(writeSummary(outcome, outcome.result, before, outcome.written || dryRun ? [field] : [], dryRun));
  },
);

server.registerTool(
  "upload_post_image",
  {
    title: "Enviar imagem do post",
    description:
      "Envia uma imagem (png, jpg, webp, gif, svg ou pdf), de um arquivo local ou URL https, para a pasta do post no Storage " +
      "e devolve a referência `db:...` e o Markdown pronto. Como no painel, PNG/JPG/WebP viram WebP de até 1600 px. " +
      "Opcionalmente já define como capa. Para pôr no meio do texto, use edit_post_text com o Markdown devolvido.",
    inputSchema: {
      slug: slugParam,
      filePath: z.string().optional().describe("Caminho absoluto do arquivo nesta máquina."),
      url: z.string().optional().describe("Ou: URL https da imagem."),
      fileName: z.string().optional().describe("Nome no Storage (sem pasta). Padrão: o nome do arquivo."),
      keepFormat: z.boolean().optional().describe("true mantém PNG/JPG em vez de converter para WebP."),
      cover: z.boolean().optional().describe("true define a imagem como capa do post."),
      alt: z.string().optional().describe("Descrição da imagem, usada no Markdown devolvido."),
      note: noteParam,
    },
    annotations: { destructiveHint: false },
  },
  async ({ slug, filePath, url, fileName, keepFormat, cover = false, alt, note }) => {
    const { data } = await readPortfolio();
    const target = findPost(data.posts ?? [], slug);
    const image = await uploadImage({ filePath, url }, `posts/${slugOf(target)}`, { fileName, keepFormat });
    const markdown = `![${alt || ""}](${image.ref})`;
    const edit = {
      tool: "upload_post_image",
      target: slug,
      note,
      files: [{ collection: "images", id: image.path, action: "enviado" } satisfies FileChange],
    };
    if (!cover) {
      await logFileEdit(edit);
      return reply({ ...image, markdown });
    }

    let before: BlogPost | null = null;
    const outcome = await updatePortfolio(edit, (doc) => {
      const posts = doc.posts ?? [];
      const current = findPost(posts, slug);
      before = current;
      const others = posts.filter((p) => p.id !== current.id);
      const applied = applyPostChanges(current, { imageUrl: image.ref }, others, doc.projects);
      doc.posts = posts.map((p) => (p.id === current.id ? applied.post : p));
      return { result: applied, changed: applied.changedFields.length > 0 };
    });
    return reply({ ...image, markdown, ...writeSummary(outcome, outcome.result.post, before, outcome.result.changedFields, false) });
  },
);

server.registerTool(
  "list_backups",
  {
    title: "Listar cópias locais",
    description:
      "Cópias do documento salvas antes de cada gravação feita pelos servidores do portfólio (as 50 mais recentes). " +
      "O nome traz a data (UTC), a ferramenta e o post ou projeto.",
    inputSchema: { filter: z.string().optional().describe("Filtra pelo nome (ex.: código do post).") },
    annotations: { readOnlyHint: true },
  },
  async ({ filter }) => {
    const backups = (await listBackups()).filter((name) => !filter || name.includes(filter));
    return reply({ total: backups.length, backups });
  },
);

server.registerTool(
  "restore_post",
  {
    title: "Restaurar post",
    description:
      "Desfaz alterações: devolve um post ao estado em que estava numa cópia local (de list_backups ou do backupPath de uma gravação). " +
      "Só esse post muda; o resto do site fica como está. Recria o post se ele tiver sido apagado.",
    inputSchema: {
      slug: slugParam,
      backup: z.string().min(1).describe("Nome do arquivo da cópia ou o backupPath devolvido."),
      note: noteParam,
      dryRun: dryRunParam,
    },
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  async ({ slug, backup, note, dryRun = false }) => {
    const saved = findPost((await readBackup(backup)).posts ?? [], slug);
    let before: BlogPost | null = null;
    const outcome = await updatePortfolio(
      { tool: "restore_post", target: slug, note },
      (doc) => {
        const posts = doc.posts ?? [];
        const current = posts.find((p) => p.id === saved.id) ?? null;
        before = current;
        const taken = findBySlug(posts.filter((p) => p.id !== saved.id), slugOf(saved));
        if (taken) throw new Error(`O código "${slugOf(saved)}" agora pertence a "${taken.title}". Renomeie um dos dois antes.`);
        doc.posts = current ? posts.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...posts];
        const original = (current ?? {}) as Record<string, unknown>;
        const restored = saved as unknown as Record<string, unknown>;
        const keys = new Set([...Object.keys(original), ...Object.keys(restored)]);
        const changedFields = [...keys].filter((key) => JSON.stringify(original[key]) !== JSON.stringify(restored[key]));
        return { result: changedFields, changed: changedFields.length > 0 };
      },
      { dryRun },
    );
    return reply(writeSummary(outcome, saved, before, outcome.result, dryRun));
  },
);

await server.connect(new StdioServerTransport());
console.error(`portfolio-blog pronto (${SITE_URL}).`);
