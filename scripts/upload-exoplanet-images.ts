/**
 * Envio único: imagens do projeto "Análise de Exoplanetas (NASA)" para o
 * bucket `images` do Supabase, na pasta `projects/analise-exoplanetas-nasa/`.
 *
 * Usa a mesma chave de serviço (`SUPABASE_SERVICE_KEY`) que
 * `migrate-to-supabase.ts` já usa — ela ignora o RLS, então não depende de
 * sessão de login.
 *
 * Uso:
 *   npx tsx scripts/upload-exoplanet-images.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  ?.trim()
  .replace(/\/(rest|auth|storage|realtime)\/v1\/?$/, "")
  .replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltam VITE_SUPABASE_URL / SUPABASE_SERVICE_KEY no .env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SOURCE_DIR =
  "C:\\Users\\pedro\\OneDrive\\Documentos\\programação\\03-faculdade\\nexus\\exoplanet-analysis\\docs\\portfolio-imagens";

const PROJECT_FOLDER = "projects/analise-exoplanetas-nasa";

const FILES = [
  "discovery_methods_years.png",
  "missing_values.png",
  "mass_radius_period_scatter.png",
  "correlation_heatmap.png",
  "distributions_log.png",
];

async function main() {
  for (const fileName of FILES) {
    const localPath = join(SOURCE_DIR, fileName);
    const bytes = readFileSync(localPath);
    const bucketPath = `${PROJECT_FOLDER}/${fileName}`;

    const { error } = await supabase.storage
      .from("images")
      .upload(bucketPath, bytes, {
        contentType: "image/png",
        upsert: true,
        cacheControl: "31536000",
      });

    if (error) {
      console.error(`FALHOU: ${fileName} ->`, error.message);
      continue;
    }

    console.log(`OK  db:${bucketPath}`);
  }
}

main();
