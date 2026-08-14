import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * O painel do Supabase mostra a URL do projeto e a do endpoint REST lado a
 * lado, e é fácil copiar a errada. O `supabase-js` acrescenta `/rest/v1` (ou
 * `/storage/v1`, `/auth/v1`) por conta própria, então uma URL já terminada em
 * `/rest/v1` produziria caminhos duplicados e falhas silenciosas. Normalizamos
 * aqui em vez de depender de todo mundo copiar a linha certa.
 */
function normalizeSupabaseUrl(value?: string): string | undefined {
  if (!value) return value;
  return value.trim().replace(/\/(rest|auth|storage|realtime)\/v1\/?$/, "").replace(/\/+$/, "");
}

const url = normalizeSupabaseUrl(rawUrl);

/**
 * Indica se as credenciais do Supabase foram fornecidas. Quando falso, o site
 * ainda funciona: as camadas de dados caem para o conteúdo local em vez de
 * disparar requisições que fatalmente falhariam.
 *
 * A chave `anon` é pública por natureza — quem protege os dados é o RLS
 * configurado em supabase/setup.sql, não o segredo da chave.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. " +
    "O site vai operar apenas com os dados locais."
  );
}

// Valores de espaço reservado mantêm o createClient válido quando as variáveis
// de ambiente faltam; nenhuma chamada é feita nesse estado.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/** Nome da tabela que guarda o documento único do portfólio. */
export const PORTFOLIO_TABLE = "portfolio";

/** Identificador da linha única do portfólio. */
export const PORTFOLIO_ROW_ID = "main";

/** Bucket público onde ficam as imagens do site. */
export const IMAGES_BUCKET = "images";
