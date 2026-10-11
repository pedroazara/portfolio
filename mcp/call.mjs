/**
 * Chama uma ferramenta de um servidor MCP do portfólio pela linha de comando,
 * falando o protocolo MCP (stdio), sem precisar registrar o servidor num
 * cliente. Serve para rotinas agendadas e testes rápidos.
 *
 *   node mcp/call.mjs painel list_daily_updates '{"kind":"ingles","limit":5}'
 *   node mcp/call.mjs painel publish_daily_update '{"kind":"ingles","title":"...","content":"..."}'
 *
 * O servidor herda o ambiente deste processo (credenciais do Supabase em
 * variáveis de ambiente ou no .env do portfólio).
 */
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const [server, tool, rawArgs = "{}"] = process.argv.slice(2);
if (!server || !tool) {
  console.error("Uso: node mcp/call.mjs <servidor> <ferramenta> ['{\"arg\":\"valor\"}']");
  process.exit(1);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL("./run.mjs", import.meta.url)), server],
  env: Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)),
  stderr: "inherit",
});
const client = new Client({ name: process.env.PORTFOLIO_MCP_AGENT?.trim() || "portfolio-call", version: "0.1.0" });
await client.connect(transport);
try {
  const result = await client.callTool({ name: tool, arguments: JSON.parse(rawArgs) });
  for (const item of result.content ?? []) if (item.type === "text") console.log(item.text);
  process.exitCode = result.isError ? 1 : 0;
} finally {
  await client.close();
}
