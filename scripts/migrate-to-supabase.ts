/**
 * Migração única: Firestore -> Supabase.
 *
 * Lê o portfólio e as imagens do projeto Firebase antigo pela API REST e
 * grava tudo no Supabase: os dados na tabela `portfolio`, as imagens como
 * arquivos no bucket `images`.
 *
 * Antes de rodar:
 *   1. Execute supabase/setup.sql no SQL Editor do Supabase.
 *   2. Preencha no .env:
 *        VITE_SUPABASE_URL
 *        SUPABASE_SERVICE_KEY   (Project Settings > API Keys > service_role)
 *      A service_role ignora o RLS — por isso a migração funciona antes
 *      mesmo de existir um usuário. Nunca exponha essa chave no front-end.
 *   3. As regras do Firestore precisam ainda permitir leitura pública
 *      (é o estado atual do projeto).
 *
 * Uso:
 *   npx tsx scripts/migrate-to-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// --- Origem: projeto Firebase antigo -------------------------------------
const FIREBASE_PROJECT_ID = "helpful-magnet-1wjrd";
const FIREBASE_DATABASE_ID = "ai-studio-3dd2fc48-171e-4247-9594-2287a0634df5";
const FIREBASE_API_KEY = "AIzaSyCsYszSgyeQQCyn26_TRqqdXclQJSPyKj8";

const FIRESTORE_BASE =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
  `/databases/${FIREBASE_DATABASE_ID}/documents`;

// --- Destino: Supabase ----------------------------------------------------
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Faltam variáveis de ambiente.\n" +
    "  VITE_SUPABASE_URL   = " + (SUPABASE_URL ? "ok" : "FALTANDO") + "\n" +
    "  SUPABASE_SERVICE_KEY = " + (SERVICE_KEY ? "ok" : "FALTANDO") + "\n" +
    "Preencha o .env antes de rodar a migração."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// -------------------------------------------------------------------------
// Decodificação do formato de valores tipados do Firestore.
// O Firestore devolve { stringValue: "x" } em vez de "x", e assim por diante.
// -------------------------------------------------------------------------
type FirestoreValue = Record<string, any>;

function decodeValue(value: FirestoreValue): unknown {
  if (value === null || value === undefined) return null;

  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("referenceValue" in value) return value.referenceValue;

  if ("arrayValue" in value) {
    const values = value.arrayValue?.values;
    return Array.isArray(values) ? values.map(decodeValue) : [];
  }

  if ("mapValue" in value) {
    return decodeFields(value.mapValue?.fields ?? {});
  }

  return null;
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = decodeValue(value);
  }
  return out;
}

async function firestoreGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${FIRESTORE_BASE}/${path}`);
  url.searchParams.set("key", FIREBASE_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore ${response.status} em ${path}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

// -------------------------------------------------------------------------
// Etapa 1: dados do portfólio
// -------------------------------------------------------------------------
async function migratePortfolioData(): Promise<boolean> {
  console.log("\n[1/2] Migrando dados do portfólio...");

  let doc: any;
  try {
    doc = await firestoreGet("portfolio_data/main");
  } catch (err) {
    console.error("  Não foi possível ler portfolio_data/main:", (err as Error).message);
    return false;
  }

  if (!doc?.fields) {
    console.warn("  Documento vazio ou inexistente. Nada a migrar.");
    return false;
  }

  const data = decodeFields(doc.fields);
  const counts = {
    projetos: Array.isArray((data as any).projects) ? (data as any).projects.length : 0,
    posts: Array.isArray((data as any).posts) ? (data as any).posts.length : 0,
    experiencias: Array.isArray((data as any).experiences) ? (data as any).experiences.length : 0,
  };
  console.log(
    `  Lido: ${counts.projetos} projetos, ${counts.posts} posts, ${counts.experiencias} experiências.`
  );

  const { error } = await supabase
    .from("portfolio")
    .upsert({ id: "main", data, updated_at: new Date().toISOString() }, { onConflict: "id" });

  if (error) {
    console.error("  Falha ao gravar no Supabase:", error.message);
    return false;
  }

  console.log("  Dados gravados na tabela `portfolio`.");
  return true;
}

// -------------------------------------------------------------------------
// Etapa 2: imagens
// -------------------------------------------------------------------------
function mimeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;,]+)[;,]/.exec(dataUrl);
  return match ? match[1] : "application/octet-stream";
}

function bufferFromDataUrl(dataUrl: string): Buffer {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) throw new Error("data URL sem vírgula separadora");
  const payload = dataUrl.slice(commaIndex + 1);
  const isBase64 = /;base64/i.test(dataUrl.slice(0, commaIndex));
  return isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf-8");
}

async function migrateImages(): Promise<void> {
  console.log("\n[2/2] Migrando imagens...");

  let pageToken: string | undefined;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  do {
    const params: Record<string, string> = { pageSize: "10" };
    if (pageToken) params.pageToken = pageToken;

    let page: any;
    try {
      page = await firestoreGet("portfolio_images", params);
    } catch (err) {
      console.error("  Falha ao listar imagens:", (err as Error).message);
      return;
    }

    for (const doc of page.documents ?? []) {
      const fields = decodeFields(doc.fields ?? {}) as {
        name?: string;
        dataUrl?: string;
      };

      const name = fields.name || String(doc.name).split("/").pop();
      if (!name || !fields.dataUrl) {
        console.warn(`  ignorada (sem nome ou conteúdo): ${name ?? "?"}`);
        skipped++;
        continue;
      }

      try {
        const body = bufferFromDataUrl(fields.dataUrl);
        const { error } = await supabase.storage
          .from("images")
          .upload(name, body, {
            contentType: mimeFromDataUrl(fields.dataUrl),
            upsert: true,
            cacheControl: "31536000",
          });

        if (error) throw error;

        migrated++;
        console.log(`  ok  ${name} (${Math.round(body.length / 1024)} KB)`);
      } catch (err) {
        failed++;
        console.error(`  ERRO ${name}: ${(err as Error).message}`);
      }
    }

    pageToken = page.nextPageToken;
  } while (pageToken);

  console.log(`\n  Imagens: ${migrated} migradas, ${skipped} ignoradas, ${failed} com erro.`);
}

// -------------------------------------------------------------------------
async function main() {
  // Por padrão só as imagens são migradas: o texto que está no Firestore é de
  // outra pessoa, e o site começa limpo a partir de src/data/initialData.ts.
  // Passe --with-data para trazer também o documento de texto.
  const withData = process.argv.includes("--with-data");

  console.log("Migração Firestore -> Supabase");
  console.log(`  Origem : ${FIREBASE_PROJECT_ID} (${FIREBASE_DATABASE_ID})`);
  console.log(`  Destino: ${SUPABASE_URL}`);
  console.log(`  Modo   : ${withData ? "imagens + dados de texto" : "somente imagens"}`);

  if (withData) {
    await migratePortfolioData();
  } else {
    console.log("\n[1/2] Dados de texto: pulados (use --with-data para incluir).");
  }

  await migrateImages();

  console.log("\nMigração concluída. Confira os dados no painel do Supabase.");
}

main().catch((err) => {
  console.error("\nMigração interrompida:", err);
  process.exit(1);
});
