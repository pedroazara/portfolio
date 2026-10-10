import os from "node:os";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupabase } from "./supabase";

/**
 * Autoria das edições feitas pelos servidores MCP.
 *
 * O registro (supabase/edit_log.sql) é escrito por um gatilho no banco a cada
 * gravação do documento. Para ele saber que foi um agente — e qual —, cada
 * gravação leva o cabeçalho `x-portfolio-edit` com a identificação abaixo.
 * Operações só de arquivo (enviar ou apagar imagem sem tocar no conteúdo) não
 * passam pelo gatilho e são anotadas direto, por `logFileEdit`.
 */

export interface FileChange {
  collection: "images";
  id: string;
  action: "enviado" | "editado" | "recortado" | "movido" | "apagado";
  /** Caminho anterior, em `movido`. */
  from?: string;
}

export interface EditInfo {
  /** Ferramenta MCP que fez a alteração. */
  tool: string;
  /** Alvo, para nomear a cópia local (ex.: código do projeto). */
  target: string;
  /** Frase do agente explicando a alteração; aparece no painel. */
  note?: string;
  files?: FileChange[];
}

/** Parâmetro comum às ferramentas que gravam. */
export const noteParam = z
  .string()
  .max(500)
  .optional()
  .describe("Frase curta dizendo o que foi feito e por quê. Aparece no registro de edições do painel.");

const identity = {
  server: "portfolio",
  client: "agente",
  // Cada sessão do cliente inicia o próprio processo do servidor: este id
  // separa duas conversas simultâneas, ou a de hoje da de ontem.
  session: `${os.hostname().split(".")[0]}·${randomUUID().slice(0, 6)}`,
};

/** Guarda o nome do servidor e, quando o cliente se apresentar, o dele. */
export function trackClient(server: McpServer, serverName: string) {
  identity.server = serverName;
  server.server.oninitialized = () => {
    const client = server.server.getClientVersion();
    if (client?.name) identity.client = client.version ? `${client.name} ${client.version}` : client.name;
  };
}

function agentLabel(): string {
  return process.env.PORTFOLIO_MCP_AGENT?.trim() || `${identity.client} · ${identity.server}`;
}

function entry(edit: EditInfo) {
  return { agent: agentLabel(), session: identity.session, tool: edit.tool, note: edit.note?.slice(0, 500), files: edit.files };
}

/** Valor do cabeçalho `x-portfolio-edit`: JSON em base64 (cabeçalhos não aceitam acentos). */
export function editHeader(edit: EditInfo): string {
  return Buffer.from(JSON.stringify(entry(edit))).toString("base64");
}

/** Anota uma operação só de arquivos. Falhar aqui não desfaz a operação. */
export async function logFileEdit(edit: EditInfo): Promise<void> {
  try {
    const supabase = await getSupabase();
    const { agent, session, tool, note, files } = entry(edit);
    const { error } = await supabase
      .from("portfolio_edit_log")
      .insert({ source: "agente", agent, session, tool, note, changes: files ?? [] });
    if (error) throw error;
  } catch (error) {
    console.error("Registro de edições indisponível (rode supabase/edit_log.sql):", (error as Error).message);
  }
}
