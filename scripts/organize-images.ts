/**
 * Reorganiza o bucket de imagens em pastas.
 *
 * As imagens migradas do Firestore caíram todas na raiz do bucket. Este script
 * as move para a convenção de pastas do site:
 *
 *   projects/<codigo>/arquivo.webp   imagens de um projeto
 *   geral/arquivo.webp               avatar, capas e imagens do site
 *
 * O projeto de destino é deduzido pelo prefixo do nome do arquivo: um arquivo
 * chamado `yolocraft-deteccao-1.webp` pertence ao projeto de código `yolocraft`.
 * O que não casar com nenhum código vai para `geral/`.
 *
 * Também reescreve as referências `db:` na linha `main` da tabela `portfolio`,
 * para que o conteúdo continue apontando para os arquivos movidos.
 *
 * Uso:
 *   npx tsx scripts/organize-images.ts --dry-run   (só mostra o plano)
 *   npx tsx scripts/organize-images.ts             (aplica)
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
  console.error(
    "Faltam variáveis de ambiente:\n" +
    "  VITE_SUPABASE_URL    = " + (SUPABASE_URL ? "ok" : "FALTANDO") + "\n" +
    "  SUPABASE_SERVICE_KEY = " + (SERVICE_KEY ? "ok" : "FALTANDO")
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "images";
const DRY_RUN = process.argv.includes("--dry-run");

/** Códigos de projeto conhecidos, lidos da própria linha do portfólio. */
async function loadProjectCodes(): Promise<string[]> {
  const { data, error } = await supabase
    .from("portfolio")
    .select("data")
    .eq("id", "main")
    .maybeSingle();

  if (error) throw error;

  const projects = (data?.data as { projects?: { codigo?: string; id: string }[] } | null)?.projects;
  if (!projects) return [];

  return projects
    .map((p) => p.codigo)
    .filter((c): c is string => Boolean(c))
    // Códigos mais longos primeiro: assim `yolocraft-v2` ganha de `yolocraft`
    // quando os dois casam com o mesmo arquivo.
    .sort((a, b) => b.length - a.length);
}

/** Arquivos soltos na raiz do bucket. */
async function listRootFiles(): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) throw error;

  return (data ?? [])
    // Pastas vêm sem `id`; o marcador de pasta vazia não é um arquivo.
    .filter((item) => item.id !== null && item.name !== ".emptyFolderPlaceholder")
    .map((item) => item.name);
}

function destinationFor(fileName: string, codes: string[]): string {
  const match = codes.find((code) => fileName.startsWith(code));
  return match ? `projects/${match}/${fileName}` : `geral/${fileName}`;
}

async function main() {
  console.log(`Organizando o bucket "${BUCKET}"${DRY_RUN ? " (simulação)" : ""}\n`);

  const codes = await loadProjectCodes();
  console.log(`  Códigos de projeto conhecidos: ${codes.length ? codes.join(", ") : "(nenhum)"}`);

  const files = await listRootFiles();
  if (files.length === 0) {
    console.log("  Nenhum arquivo solto na raiz. Nada a fazer.");
    return;
  }
  console.log(`  ${files.length} arquivos na raiz.\n`);

  const moves = files.map((name) => ({ from: name, to: destinationFor(name, codes) }));
  const renames = new Map<string, string>();

  let moved = 0;
  let failed = 0;

  for (const { from, to } of moves) {
    if (DRY_RUN) {
      console.log(`  [simulado] ${from}  ->  ${to}`);
      renames.set(from, to);
      continue;
    }

    const { error } = await supabase.storage.from(BUCKET).move(from, to);
    if (error) {
      failed++;
      console.error(`  ERRO ${from}: ${error.message}`);
      continue;
    }

    moved++;
    renames.set(from, to);
    console.log(`  ok  ${from}  ->  ${to}`);
  }

  await rewriteReferences(renames);

  console.log(
    DRY_RUN
      ? `\n  Simulação: ${moves.length} arquivos seriam movidos. Rode sem --dry-run para aplicar.`
      : `\n  ${moved} movidos, ${failed} com erro.`
  );
}

/**
 * Atualiza as referências `db:<antigo>` para `db:<novo>` no conteúdo do site.
 * Sem isto, as imagens continuariam no bucket mas o site apontaria para o
 * caminho antigo e mostraria a imagem de fallback.
 */
async function rewriteReferences(renames: Map<string, string>): Promise<void> {
  if (renames.size === 0) return;

  const { data, error } = await supabase
    .from("portfolio")
    .select("data")
    .eq("id", "main")
    .maybeSingle();

  if (error) throw error;
  if (!data?.data) {
    console.log("\n  Nenhuma linha `main` na tabela portfolio — sem referências a reescrever.");
    return;
  }

  let serialized = JSON.stringify(data.data);
  let replaced = 0;

  for (const [from, to] of renames) {
    // A referência é `db:` seguida do caminho. Ancoramos no `db:` para não
    // acertar um nome que apareça por acaso no meio de outro texto.
    const pattern = new RegExp(`db:${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=["',\\s\\\\]|$)`, "g");
    const before = serialized;
    serialized = serialized.replace(pattern, `db:${to}`);
    if (serialized !== before) replaced++;
  }

  console.log(`\n  Referências reescritas em ${replaced} caminhos distintos.`);

  if (DRY_RUN || replaced === 0) return;

  const { error: writeError } = await supabase
    .from("portfolio")
    .update({ data: JSON.parse(serialized), updated_at: new Date().toISOString() })
    .eq("id", "main");

  if (writeError) throw writeError;
  console.log("  Tabela `portfolio` atualizada.");
}

main().catch((err) => {
  console.error("\nFalhou:", err);
  process.exit(1);
});
