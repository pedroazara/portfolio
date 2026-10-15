import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Project } from "../../src/types";
import { findBySlug, slugOf } from "../../src/utils/slug";
import { logFileEdit, noteParam, trackClient, type FileChange } from "../core/editLog";
import { SITE_URL } from "../core/env";
import { putObject, uploadImage } from "../core/images";
import { COVER_SLOTS, type CoverSlot } from "../../src/lib/coverPack";
import { buildCoverPack, coverPackRefs, planCoverPack, prepareArt, readPackSource, renderOgImage, type Theme } from "./coverPack";
import { listBackups, readBackup, readPortfolio, updatePortfolio } from "../core/portfolioDocument";
import { reply } from "../core/reply";
import {
  TEXT_FIELDS,
  applyProjectChanges,
  buildNewProject,
  editText,
  findProject,
  findProjectByRepo,
  matchesQuery,
  preview,
  projectChangesShape,
  summarizeProject,
  type NewProjectInput,
  type ProjectChanges,
} from "./projectOps";

/**
 * Servidor MCP "portfolio-projects": deixa uma IA ler e editar os projetos do
 * portfólio. Roda localmente, falando com o cliente por stdio.
 */

const INSTRUCTIONS = `Edita os projetos publicados no portfólio pessoal (${SITE_URL}).
Os dados ficam no Supabase, no mesmo documento que o painel do site edita.

Regras:
- Leia o projeto com get_project antes de editar. Num repositório de código, get_project com repoUrl (o remote do git) acha o projeto correspondente.
- O site é bilíngue. Ao alterar um campo em português, atualize o equivalente em inglês (titleEn, descriptionEn, detailedDescriptionEn, scientificRelevanceEn, highlightsEn).
- Para mudanças pontuais no corpo da página, prefira edit_project_text a reenviar o Markdown inteiro.
- Imagens: upload_project_image devolve uma referência "db:..."; no Markdown use ![descrição](db:...).
- Pacote de capas (pasta ou .zip do Claude Design): apply_cover_pack, primeiro com dryRun: true. Onde o pacote tem arte, ele vale no lugar de imageUrl.
- Projetos novos nascem como rascunho (draft: true). Só publique (draft: false) quando o usuário pedir.
- Use dryRun: true para mostrar o que mudaria antes de alterações grandes.
- Cada gravação guarda localmente uma cópia do documento anterior (campo backupPath). Para desfazer, use restore_project com essa cópia.`;

const server = new McpServer({ name: "portfolio-projects", version: "0.1.0" }, { instructions: INSTRUCTIONS });
trackClient(server, "portfolio-projects");

function links(project: Project) {
  const slug = encodeURIComponent(slugOf(project));
  const previa = project.draft && project.chavePrevia ? `?previa=${encodeURIComponent(project.chavePrevia)}` : "";
  return {
    page: `${SITE_URL}/projetos/${slug}${previa}`,
    editor: `${SITE_URL}/admin/projetos/${slug}`,
  };
}

/** Resposta padrão das ferramentas que gravam. */
function writeSummary(
  outcome: { written: boolean; backupPath?: string },
  project: Project,
  before: Project | null,
  changedFields: string[],
  dryRun: boolean,
) {
  const changes = Object.fromEntries(
    changedFields.map((field) => [
      field,
      {
        before: preview(before ? (before as unknown as Record<string, unknown>)[field] : undefined),
        after: preview((project as unknown as Record<string, unknown>)[field]),
      },
    ]),
  );
  return {
    status: dryRun ? "simulação — nada foi gravado" : outcome.written ? "gravado" : "sem alterações",
    project: summarizeProject(project),
    links: links(project),
    changes,
    backupPath: outcome.backupPath,
  };
}

const slugParam = z.string().min(1).describe("Código do projeto (o trecho do link), id ou código antigo.");
const dryRunParam = z.boolean().optional().describe("true mostra o que mudaria, sem gravar.");

server.registerTool(
  "list_projects",
  {
    title: "Listar projetos",
    description: "Lista os projetos do portfólio em resumo (código, título, situação, rascunho, repositório).",
    inputSchema: {
      query: z.string().optional().describe("Filtra por título, código, repositório, tags ou stack."),
      includeDrafts: z.boolean().optional().describe("Incluir rascunhos (padrão: true)."),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ query, includeDrafts = true }) => {
    const { data } = await readPortfolio();
    const projects = data.projects
      .filter((p) => includeDrafts || !p.draft)
      .filter((p) => matchesQuery(p, query || ""))
      .map(summarizeProject);
    return reply({ total: projects.length, projects });
  },
);

server.registerTool(
  "get_project",
  {
    title: "Ler projeto",
    description:
      "Devolve o projeto completo (todos os campos, incluindo o Markdown) e os links da página e do editor. " +
      "Informe `slug` ou `repoUrl` (URL do repositório no GitHub, em qualquer formato).",
    inputSchema: {
      slug: slugParam.optional(),
      repoUrl: z.string().optional().describe("Ex.: https://github.com/usuario/repo ou git@github.com:usuario/repo.git"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ slug, repoUrl }) => {
    if (!slug && !repoUrl) throw new Error("Informe `slug` ou `repoUrl`.");
    const { data } = await readPortfolio();
    const project = slug ? findProject(data.projects, slug) : findProjectByRepo(data.projects, repoUrl!);
    if (!project) {
      return reply({
        found: false,
        message: `Nenhum projeto tem githubUrl igual a ${repoUrl}. Use list_projects para procurar, ou create_project.`,
      });
    }
    const categories = data.categories.filter((c) => (project.categoryIds || [project.categoryId]).includes(c.id));
    return reply({ found: true, project, categories, links: links(project) });
  },
);

server.registerTool(
  "list_categories",
  {
    title: "Listar categorias",
    description: "Categorias de projeto existentes, com os IDs aceitos em `categoryIds`.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    const { data } = await readPortfolio();
    return reply(data.categories.map(({ id, name, nameEn, description }) => ({ id, name, nameEn, description })));
  },
);

server.registerTool(
  "create_project",
  {
    title: "Criar projeto",
    description:
      "Cria um projeto novo. Nasce como rascunho e 'em andamento', a não ser que `draft`/`situacao` digam o contrário. " +
      "O `codigo` sai do título quando não é informado.",
    inputSchema: {
      ...projectChangesShape,
      title: z.string().min(1).describe("Título em português."),
      note: noteParam,
      dryRun: dryRunParam,
    },
    annotations: { destructiveHint: false },
  },
  async ({ dryRun = false, note, ...input }) => {
    const outcome = await updatePortfolio(
      { tool: "create_project", target: input.codigo || input.title, note },
      (doc) => {
        const project = buildNewProject(input as NewProjectInput, doc.projects, doc.categories);
        doc.projects.push(project);
        return { result: project, changed: true };
      },
      { dryRun },
    );
    const project = outcome.result;
    return reply(writeSummary(outcome, project, null, Object.keys(project), dryRun));
  },
);

server.registerTool(
  "update_project",
  {
    title: "Atualizar projeto",
    description:
      "Altera campos de um projeto. Só os campos enviados mudam; `null` remove um campo opcional. " +
      "Listas (tags, stack, galleryImages...) são substituídas inteiras.",
    inputSchema: {
      slug: slugParam,
      changes: z.object(projectChangesShape).strict().describe("Campos a alterar."),
      note: noteParam,
      dryRun: dryRunParam,
    },
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  async ({ slug, changes, note, dryRun = false }) => {
    let before: Project | null = null;
    const outcome = await updatePortfolio(
      { tool: "update_project", target: slug, note },
      (doc) => {
        const current = findProject(doc.projects, slug);
        before = current;
        const others = doc.projects.filter((p) => p.id !== current.id);
        const applied = applyProjectChanges(current, changes as ProjectChanges, others, doc.categories);
        doc.projects = doc.projects.map((p) => (p.id === current.id ? applied.project : p));
        return { result: applied, changed: applied.changedFields.length > 0 };
      },
      { dryRun },
    );
    return reply(writeSummary(outcome, outcome.result.project, before, outcome.result.changedFields, dryRun));
  },
);

server.registerTool(
  "edit_project_text",
  {
    title: "Editar trecho do texto",
    description:
      "Troca um trecho exato de um campo de texto (como o Markdown da página) por outro, sem reenviar o texto inteiro. " +
      "Sem `oldText`, acrescenta `newText` ao fim do campo — útil para registrar novidades.",
    inputSchema: {
      slug: slugParam,
      field: z.enum(TEXT_FIELDS).describe("Campo a editar. O corpo da página é detailedDescription (PT) / detailedDescriptionEn (EN)."),
      oldText: z.string().optional().describe("Trecho atual, copiado exatamente. Precisa aparecer uma única vez."),
      newText: z.string().describe("Texto que entra no lugar (ou ao fim, sem oldText)."),
      note: noteParam,
      dryRun: dryRunParam,
    },
    annotations: { destructiveHint: true },
  },
  async ({ slug, field, oldText, newText, note, dryRun = false }) => {
    let before: Project | null = null;
    const outcome = await updatePortfolio(
      { tool: "edit_project_text", target: `${slug}-${field}`, note },
      (doc) => {
        const current = findProject(doc.projects, slug);
        before = current;
        const updated = { ...current, [field]: editText(current[field], newText, oldText) };
        doc.projects = doc.projects.map((p) => (p.id === current.id ? updated : p));
        return { result: updated, changed: updated[field] !== current[field] };
      },
      { dryRun },
    );
    return reply(writeSummary(outcome, outcome.result, before, outcome.written || dryRun ? [field] : [], dryRun));
  },
);

server.registerTool(
  "upload_project_image",
  {
    title: "Enviar imagem do projeto",
    description:
      "Envia uma imagem (png, jpg, webp, gif, svg ou pdf), de um arquivo local ou URL https, para a pasta do projeto no Storage " +
      "e devolve a referência `db:...`. Como no painel, PNG/JPG/WebP viram WebP de até 1600 px. " +
      "Opcionalmente já define como capa ou acrescenta à galeria. Para recortar, girar ou mover, use o servidor portfolio-media.",
    inputSchema: {
      slug: slugParam,
      filePath: z.string().optional().describe("Caminho absoluto do arquivo nesta máquina."),
      url: z.string().optional().describe("Ou: URL https da imagem."),
      fileName: z.string().optional().describe("Nome no Storage (sem pasta). Padrão: o nome do arquivo."),
      keepFormat: z.boolean().optional().describe("true mantém PNG/JPG em vez de converter para WebP."),
      use: z.enum(["none", "cover", "gallery"]).optional().describe("none (só envia), cover (capa) ou gallery (fim da galeria)."),
      caption: z.string().optional().describe("Legenda PT na galeria."),
      captionEn: z.string().optional().describe("Legenda EN na galeria."),
      note: noteParam,
    },
    annotations: { destructiveHint: false },
  },
  async ({ slug, filePath, url, fileName, keepFormat, use = "none", caption, captionEn, note }) => {
    const { data } = await readPortfolio();
    const target = findProject(data.projects, slug);
    const image = await uploadImage({ filePath, url }, `projects/${slugOf(target)}`, { fileName, keepFormat });
    const markdown = `![${caption || ""}](${image.ref})`;
    const edit = {
      tool: "upload_project_image",
      target: slug,
      note,
      files: [{ collection: "images", id: image.path, action: "enviado" } satisfies FileChange],
    };
    if (use === "none") {
      await logFileEdit(edit);
      return reply({ ...image, markdown });
    }

    let before: Project | null = null;
    const outcome = await updatePortfolio(edit, (doc) => {
      const current = findProject(doc.projects, slug);
      before = current;
      const changes: ProjectChanges =
        use === "cover"
          ? { imageUrl: image.ref }
          : {
              galleryImages: [...(current.galleryImages || []), image.ref],
              ...(caption ? { galleryCaptions: { ...current.galleryCaptions, [image.ref]: caption } } : {}),
              ...(captionEn ? { galleryCaptionsEn: { ...current.galleryCaptionsEn, [image.ref]: captionEn } } : {}),
            };
      const others = doc.projects.filter((p) => p.id !== current.id);
      const applied = applyProjectChanges(current, changes, others, doc.categories);
      doc.projects = doc.projects.map((p) => (p.id === current.id ? applied.project : p));
      return { result: applied, changed: applied.changedFields.length > 0 };
    });
    const packWarning =
      use === "cover" && target.coverPack
        ? { warning: "Este projeto tem pacote de capas: onde ele tem arte, a capa nova não aparece. Para voltar a usar só imageUrl, remova o pacote (update_project com coverPack: null)." }
        : {};
    return reply({ ...image, markdown, ...packWarning, ...writeSummary(outcome, outcome.result.project, before, outcome.result.changedFields, false) });
  },
);

server.registerTool(
  "apply_cover_pack",
  {
    title: "Aplicar pacote de capas",
    description:
      "Aplica um pacote de capas feito no Claude Design (skill portfolio-capas): a pasta ou o .zip com card-light.svg e card-dark.svg " +
      "(cartões, 16:9), card-mobile-*.svg (cartão no celular, 4:3), hero-*.svg (topo da página, 16:9), square-*.svg (1:1) e og.svg (1200×630). " +
      "Confere nomes, proporções e se os SVGs funcionam dentro de <img>; gera a prévia do link em JPEG 1200×630 de até 300 kB; envia tudo para " +
      "projects/<codigo>/capas/<versão>/ e grava `coverPack`, com `imageUrl` apontando para o cartão claro. Rode antes com dryRun: true para ver o plano e os avisos.",
    inputSchema: {
      slug: slugParam,
      path: z.string().min(1).describe("Caminho absoluto, nesta máquina, da pasta ou do .zip do pacote."),
      note: noteParam,
      dryRun: z.boolean().optional().describe("true confere o pacote e mostra o plano, sem enviar nem gravar."),
    },
    annotations: { destructiveHint: true },
  },
  async ({ slug, path: source, note, dryRun = false }) => {
    const { data } = await readPortfolio();
    const target = findProject(data.projects, slug);
    const codigo = slugOf(target);
    const plan = await planCoverPack(await readPackSource(source));
    if (plan.projeto && !findBySlug([target], plan.projeto)) {
      throw new Error(`O pack.json é do projeto "${plan.projeto}", não de "${codigo}". Confira o pacote, ou corrija o campo "projeto" se ele estiver errado.`);
    }

    const folder = `projects/${codigo}/capas/${Date.now().toString(36)}`;
    const arts = plan.arts.filter((art) => art.slot !== "og");
    const ogSource = plan.arts.find((art) => art.slot === "og") ?? arts.find((art) => art.slot === "card" && art.theme === "light")!;
    const report = {
      arts: arts.map((art) => ({
        lugar: `${art.slot} (${art.theme === "dark" ? "escuro" : "claro"})`,
        arquivo: art.source,
        medidas: `${art.width}×${art.height}`,
        ondeAparece: COVER_SLOTS[art.slot as CoverSlot].where,
      })),
      og: `og.jpg, 1200×630, a partir de ${ogSource.source}`,
      ignored: plan.ignored,
      warnings: plan.warnings,
    };
    if (dryRun) {
      return reply({ status: "simulação — nada foi enviado nem gravado", project: summarizeProject(target), folder, ...report });
    }

    const uploaded: { slot: CoverSlot | "og"; theme?: Theme; ref: string }[] = [];
    const files: FileChange[] = [];
    for (const art of arts) {
      const prepared = await prepareArt(art);
      const stored = await putObject(`${folder}/${COVER_SLOTS[art.slot as CoverSlot].file}-${art.theme}${prepared.ext}`, prepared.body);
      uploaded.push({ slot: art.slot, theme: art.theme, ref: `db:${stored}` });
      files.push({ collection: "images", id: stored, action: "enviado" });
    }
    const ogStored = await putObject(`${folder}/og.jpg`, await renderOgImage(ogSource));
    uploaded.push({ slot: "og", ref: `db:${ogStored}` });
    files.push({ collection: "images", id: ogStored, action: "enviado" });
    const coverPack = buildCoverPack(uploaded);

    let before: Project | null = null;
    const outcome = await updatePortfolio({ tool: "apply_cover_pack", target: slug, note, files }, (doc) => {
      const current = findProject(doc.projects, slug);
      before = current;
      const others = doc.projects.filter((p) => p.id !== current.id);
      const applied = applyProjectChanges(current, { coverPack, imageUrl: coverPack.card!.light }, others, doc.categories);
      doc.projects = doc.projects.map((p) => (p.id === current.id ? applied.project : p));
      return { result: applied, changed: applied.changedFields.length > 0 };
    });
    const previous = coverPackRefs((before as Project | null)?.coverPack);
    return reply({
      ...writeSummary(outcome, outcome.result.project, before, outcome.result.changedFields, false),
      folder,
      ...report,
      ...(previous.length
        ? {
            previousPack: {
              refs: previous,
              message: "A versão anterior do pacote continua no Storage. Para liberar espaço, apague com delete_image (portfolio-media) — só com o ok do usuário.",
            },
          }
        : {}),
    });
  },
);

server.registerTool(
  "list_backups",
  {
    title: "Listar cópias locais",
    description:
      "Cópias do documento salvas antes de cada gravação feita por estes servidores (as 50 mais recentes). " +
      "O nome traz a data (UTC), a ferramenta e o projeto.",
    inputSchema: { filter: z.string().optional().describe("Filtra pelo nome (ex.: código do projeto).") },
    annotations: { readOnlyHint: true },
  },
  async ({ filter }) => {
    const backups = (await listBackups()).filter((name) => !filter || name.includes(filter));
    return reply({ total: backups.length, backups });
  },
);

server.registerTool(
  "restore_project",
  {
    title: "Restaurar projeto",
    description:
      "Desfaz alterações: devolve um projeto ao estado em que estava numa cópia local (de list_backups ou do backupPath de uma gravação). " +
      "Só esse projeto muda; o resto do site fica como está. Recria o projeto se ele tiver sido apagado.",
    inputSchema: {
      slug: slugParam,
      backup: z.string().min(1).describe("Nome do arquivo da cópia ou o backupPath devolvido."),
      note: noteParam,
      dryRun: dryRunParam,
    },
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  async ({ slug, backup, note, dryRun = false }) => {
    const saved = findProject((await readBackup(backup)).projects, slug);
    let before: Project | null = null;
    const outcome = await updatePortfolio(
      { tool: "restore_project", target: slug, note },
      (doc) => {
        const current = doc.projects.find((p) => p.id === saved.id) ?? null;
        before = current;
        const taken = findBySlug(doc.projects.filter((p) => p.id !== saved.id), slugOf(saved));
        if (taken) throw new Error(`O código "${slugOf(saved)}" agora pertence a "${taken.title}". Renomeie um dos dois antes.`);
        doc.projects = current ? doc.projects.map((p) => (p.id === saved.id ? saved : p)) : [...doc.projects, saved];
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
console.error(`portfolio-projects pronto (${SITE_URL}).`);
