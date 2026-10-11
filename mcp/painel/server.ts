import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DAILY_UPDATE_KINDS, type DailyUpdate } from "../../src/lib/dailyUpdates";
import { agentLabel, trackClient } from "../core/editLog";
import { SITE_URL } from "../core/env";
import { reply } from "../core/reply";
import { getSupabase } from "../core/supabase";
import { normalizeKind, resolveDay } from "./painelOps";

/**
 * Servidor MCP "portfolio-painel": publica as atualizações diárias que
 * aparecem na aba Atualizações do painel pessoal (tabela admin_daily_updates,
 * supabase/daily_updates.sql). Roda localmente, falando com o cliente por stdio.
 */

const TABLE = "admin_daily_updates";
const PANEL_URL = `${SITE_URL}/admin/painel/atualizacoes`;
const kinds = Object.entries(DAILY_UPDATE_KINDS)
  .map(([key, { label, description }]) => `"${key}" (${label}: ${description})`)
  .join("; ");

const INSTRUCTIONS = `Publica as atualizações diárias do painel pessoal de Pedro (${PANEL_URL}).
É um espaço privado: nada daqui aparece no portfólio público.

Séries conhecidas: ${kinds}. Outras séries podem ser criadas com um nome curto em minúsculas.

Regras:
- Antes de publicar, chame list_daily_updates da mesma série para não repetir um tema recente.
- Uma atualização por série e por dia: publicar de novo no mesmo dia substitui a anterior.
- O conteúdo é Markdown, em português, curto e direto.
- Dica de inglês (kind "ingles"): título com a expressão em inglês, significado, dois ou três exemplos em itálico e uma observação de uso ou erro comum de brasileiros.
- Agenda (kind "agenda"): título "Agenda do dia" (ou "Dia livre" sem compromissos); no conteúdo, um item por evento com o horário em negrito (**09:00–10:00**), o nome e, se houver, o local ou o link da chamada. Eventos de dia inteiro primeiro. Horários no fuso de São Paulo.`;

const server = new McpServer({ name: "portfolio-painel", version: "0.1.0" }, { instructions: INSTRUCTIONS });
trackClient(server, "portfolio-painel");

function tableError(message: string, code?: string): Error {
  if (code === "42P01" || code === "PGRST205") {
    return new Error("A tabela admin_daily_updates não existe. Rode supabase/daily_updates.sql no SQL Editor do Supabase.");
  }
  return new Error(message);
}

server.registerTool(
  "list_daily_updates",
  {
    title: "Listar atualizações diárias",
    description: "Atualizações já publicadas, das mais recentes às mais antigas (dia, série, título e, opcionalmente, o conteúdo).",
    inputSchema: {
      kind: z.string().optional().describe('Série, ex.: "ingles". Sem ela, lista todas.'),
      limit: z.number().int().min(1).max(200).optional().describe("Quantas (padrão: 30)."),
      includeContent: z.boolean().optional().describe("Incluir o Markdown de cada uma (padrão: false)."),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ kind, limit = 30, includeContent = false }) => {
    const supabase = await getSupabase();
    let query = supabase
      .from(TABLE)
      .select(includeContent ? "day,kind,title,content,source,read_at" : "day,kind,title,source,read_at")
      .order("day", { ascending: false })
      .limit(limit);
    if (kind) query = query.eq("kind", normalizeKind(kind));
    const { data, error } = await query;
    if (error) throw tableError(`Não foi possível listar: ${error.message}`, error.code);
    return reply({ total: data?.length ?? 0, updates: data ?? [] });
  },
);

server.registerTool(
  "publish_daily_update",
  {
    title: "Publicar atualização diária",
    description:
      "Publica (ou substitui) a atualização de uma série num dia. Aparece na aba Atualizações do painel, marcada como nova.",
    inputSchema: {
      kind: z.string().min(1).describe('Série, ex.: "ingles".'),
      title: z.string().min(1).max(200).describe("Título curto. Na dica de inglês, a própria expressão."),
      content: z.string().max(8000).describe("Corpo em Markdown."),
      day: z.string().optional().describe("Dia AAAA-MM-DD. Padrão: hoje no fuso de São Paulo."),
      dryRun: z.boolean().optional().describe("true mostra o que seria gravado, sem gravar."),
    },
    annotations: { idempotentHint: true },
  },
  async ({ kind, title, content, day, dryRun = false }) => {
    const row = {
      kind: normalizeKind(kind),
      day: resolveDay(day),
      title: title.trim(),
      content: content.trim(),
      source: agentLabel(),
      read_at: null,
      updated_at: new Date().toISOString(),
    };
    if (dryRun) return reply({ status: "simulação — nada foi gravado", update: row, panel: PANEL_URL });
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: "kind,day" })
      .select("id,kind,day,title,updated_at")
      .single<Pick<DailyUpdate, "id" | "kind" | "day" | "title" | "updated_at">>();
    if (error) throw tableError(`Não foi possível publicar: ${error.message}`, error.code);
    return reply({
      status: "publicado",
      update: data,
      panel: PANEL_URL,
    });
  },
);

await server.connect(new StdioServerTransport());
console.error(`portfolio-painel pronto (${PANEL_URL}).`);
