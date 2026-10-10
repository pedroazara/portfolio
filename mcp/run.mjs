/**
 * Ponto de entrada dos servidores MCP do portfólio.
 *
 *   node <caminho-do-portfolio>/mcp/run.mjs projects   (projetos)
 *   node <caminho-do-portfolio>/mcp/run.mjs media      (imagens)
 *
 * O cliente MCP (Claude Code, Claude Desktop...) inicia o servidor com o
 * diretório do projeto que está sendo editado como pasta atual — não o do
 * portfólio. Por isso nada aqui depende da pasta atual: o `tsx` é carregado do
 * node_modules deste repositório e o tsconfig é o daqui. Assim o mesmo comando
 * funciona de qualquer pasta, sem passo de build.
 *
 * Nada pode ser escrito em stdout além do protocolo: é por ele que o cliente
 * conversa com o servidor. Mensagens de diagnóstico vão para stderr.
 */
import { fileURLToPath } from "node:url";
import { register } from "tsx/esm/api";

const SERVERS = {
  projects: "./projects/server.ts",
  media: "./media/server.ts",
};

const name = process.argv[2];
const entry = SERVERS[name];
if (!entry) {
  console.error(`Servidor MCP desconhecido: "${name ?? ""}". Disponíveis: ${Object.keys(SERVERS).join(", ")}.`);
  process.exit(1);
}

register({ tsconfig: fileURLToPath(new URL("../tsconfig.json", import.meta.url)) });
await import(new URL(entry, import.meta.url).href);
