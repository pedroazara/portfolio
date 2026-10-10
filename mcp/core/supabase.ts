import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "./env";

/**
 * Cliente do Supabase para os servidores MCP.
 *
 * Duas formas de obter permissão de escrita, nesta ordem:
 *
 *   1. Login do administrador (`PORTFOLIO_MCP_EMAIL` + `PORTFOLIO_MCP_PASSWORD`,
 *      com `VITE_SUPABASE_ANON_KEY`). Passa pelo RLS como o painel do site e
 *      fica registrado como autor no histórico de revisões.
 *   2. `SUPABASE_SERVICE_KEY`, a mesma dos scripts de manutenção. Ignora o RLS,
 *      então é mais poderosa do que o necessário — serve quando o login não
 *      estiver configurado.
 *
 * Nenhuma das duas sai desta máquina: o servidor roda localmente e só fala
 * com o Supabase.
 */

const url = process.env.VITE_SUPABASE_URL
  ?.trim()
  .replace(/\/(rest|auth|storage|realtime)\/v1\/?$/, "")
  .replace(/\/+$/, "");

let clientPromise: Promise<SupabaseClient> | null = null;

async function connect(): Promise<SupabaseClient> {
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const email = process.env.PORTFOLIO_MCP_EMAIL;
  const password = process.env.PORTFOLIO_MCP_PASSWORD;
  const options = { auth: { persistSession: false, autoRefreshToken: true } };

  if (!url) throw new Error("Defina VITE_SUPABASE_URL no .env do portfólio.");

  if (email && password && anonKey) {
    const client = createClient(url, anonKey, options);
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(`Login do administrador falhou: ${error.message}`);
    return client;
  }
  if (serviceKey) return createClient(url, serviceKey, options);

  throw new Error(
    "Sem credencial de escrita. Defina PORTFOLIO_MCP_EMAIL e PORTFOLIO_MCP_PASSWORD " +
      "(recomendado) ou SUPABASE_SERVICE_KEY no .env do portfólio.",
  );
}

/** Cliente autenticado, criado na primeira chamada e reaproveitado depois. */
export function getSupabase(): Promise<SupabaseClient> {
  // Uma falha (senha errada, rede) não fica guardada: a próxima tentativa
  // conecta de novo, sem precisar reiniciar o servidor.
  clientPromise ??= connect().catch((error) => {
    clientPromise = null;
    throw error;
  });
  return clientPromise;
}
