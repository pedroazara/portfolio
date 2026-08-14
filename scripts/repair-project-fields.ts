/**
 * Reparo pontual: restaura campos que o editor de projetos apagava ao salvar.
 *
 * Até a correção no ProjectEditorModal, salvar um projeto descartava os campos
 * que o formulário não editava — entre eles `codigo` (usado nos links) e
 * `draft` (que mantém rascunhos fora do ar). Este script devolve esses campos
 * aos projetos conhecidos na linha `main` da tabela `portfolio`.
 *
 * Uso:  npx tsx scripts/repair-project-fields.ts [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  ?.trim()
  .replace(/\/(rest|auth|storage|realtime)\/v1\/?$/, "")
  .replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY no .env para rodar o reparo.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DRY_RUN = process.argv.includes("--dry-run");

/** Campos perdidos, por id de projeto, conforme o initialData original. */
const RESTORE: Record<string, Record<string, unknown>> = {
  "proj-portfolio": { codigo: "portfolio-site", tipo: "projeto" },
  "proj-yolocraft": { codigo: "yolocraft", tipo: "projeto" },
  "proj-ic-automacao": { codigo: "automacao-bancada-ic", tipo: "projeto" },
};

/** Ids cujo texto ainda é o placeholder — se `draft` sumiu, volta a ser true. */
const PLACEHOLDER_HINTS: Record<string, string> = {
  "proj-ic-automacao": "Descreva aqui os drivers",
};

async function main() {
  const { data, error } = await supabase
    .from("portfolio")
    .select("data")
    .eq("id", "main")
    .maybeSingle();

  if (error) throw error;
  if (!data?.data) {
    console.log("Nenhuma linha `main` na tabela portfolio. Nada a reparar.");
    return;
  }

  const doc = data.data as { projects?: Record<string, unknown>[] };
  let changed = 0;

  for (const project of doc.projects || []) {
    const id = String(project.id ?? "");

    const restore = RESTORE[id];
    if (restore) {
      for (const [key, value] of Object.entries(restore)) {
        if (project[key] === undefined || project[key] === "") {
          project[key] = value;
          changed++;
          console.log(`  ${id}: ${key} <- ${JSON.stringify(value)}`);
        }
      }
    }

    const hint = PLACEHOLDER_HINTS[id];
    if (hint && project.draft !== true) {
      const description = String(project.description ?? "");
      if (description.includes(hint)) {
        project.draft = true;
        changed++;
        console.log(`  ${id}: draft <- true (texto ainda é o placeholder)`);
      }
    }
  }

  if (changed === 0) {
    console.log("Nada a reparar — todos os campos já estão presentes.");
    return;
  }

  if (DRY_RUN) {
    console.log(`\nSimulação: ${changed} campos seriam restaurados. Rode sem --dry-run para aplicar.`);
    return;
  }

  const { error: writeError } = await supabase
    .from("portfolio")
    .update({ data: doc, updated_at: new Date().toISOString() })
    .eq("id", "main");

  if (writeError) throw writeError;
  console.log(`\n${changed} campos restaurados na tabela portfolio.`);
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
