/**
 * Lista imagens do Storage que nenhum conteúdo referencia.
 *
 * Ao longo do tempo o bucket acumulou arquivos derivados que o site não usa
 * mais: variantes `og-` (geradas em dobro a cada envio, antes de o pré-render
 * passar a resolver a capa real) e recortes de capa no formato antigo, com
 * carimbo de tempo no nome — cada reenquadramento criava um arquivo novo em vez
 * de substituir o anterior.
 *
 * Não referenciado não quer dizer descartável: uma imagem recém-enviada e ainda
 * não inserida no texto também não tem referência. Por isso `--apply` remove
 * apenas as duas categorias comprovadamente derivadas; o resto é listado para
 * revisão e só sai com `--incluir-nao-referenciadas`, informado de propósito.
 *
 * Uso:
 *   npx tsx scripts/clean-images.ts                              relata
 *   npx tsx scripts/clean-images.ts --apply                      remove só as derivadas
 *   npx tsx scripts/clean-images.ts --apply --incluir-nao-referenciadas
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
  console.error("Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "images";
const APPLY = process.argv.includes("--apply");
const INCLUIR_TODAS = process.argv.includes("--incluir-nao-referenciadas");

/** Todos os arquivos do bucket, percorrendo as pastas. */
async function listAll(prefix = "", depth = 0): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;

  const files: string[] = [];
  for (const item of data ?? []) {
    if (!item.name || item.name === ".emptyFolderPlaceholder") continue;
    const path = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id === null) {
      if (depth < 3) files.push(...(await listAll(path, depth + 1)));
    } else {
      files.push(path);
    }
  }
  return files;
}

/** Caminhos citados por alguma referência `db:` no conteúdo do site. */
async function referencedPaths(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("portfolio")
    .select("data")
    .eq("id", "main")
    .maybeSingle();

  if (error) throw error;

  const refs = new Set<string>();
  if (!data?.data) return refs;

  for (const match of JSON.stringify(data.data).matchAll(/db:([^"',\s\\]+)/g)) {
    const path = match[1];
    refs.add(path);
    // Um recorte em uso mantém o original vivo: ele é a fonte de qualquer
    // reenquadramento futuro.
    if (path.endsWith(".capa.webp")) {
      refs.add(path.slice(0, -".capa.webp".length));
    }
  }
  return refs;
}

async function main() {
  const [files, refs] = await Promise.all([listAll(), referencedPaths()]);

  const unused = files.filter((f) => !refs.has(f));

  console.log(`Arquivos no bucket : ${files.length}`);
  console.log(`Referenciados      : ${files.length - unused.length}`);
  console.log(`Sem referência     : ${unused.length}\n`);

  if (unused.length === 0) {
    console.log("Nada a limpar.");
    return;
  }

  // Agrupa por motivo, para a revisão ser possível sem abrir o painel.
  const DERIVADAS_OG = "variantes og- (não usadas desde que o pré-render resolve a capa real)";
  const DERIVADAS_CAPA = "recortes de capa no formato antigo (substituídos pelo formato atual)";
  const A_REVISAR = "sem referência — pode ser imagem enviada e ainda não usada";

  const grupos: Record<string, string[]> = {
    [DERIVADAS_OG]: [],
    [DERIVADAS_CAPA]: [],
    [A_REVISAR]: [],
  };

  for (const path of unused) {
    const nome = path.split("/").pop() || path;
    if (nome.startsWith("og-")) grupos[DERIVADAS_OG].push(path);
    else if (/-capa-\d+\.webp$/.test(nome)) grupos[DERIVADAS_CAPA].push(path);
    else grupos[A_REVISAR].push(path);
  }

  for (const [motivo, lista] of Object.entries(grupos)) {
    if (lista.length === 0) continue;
    console.log(`${motivo} — ${lista.length}:`);
    for (const p of lista) console.log(`  ${p}`);
    console.log();
  }

  const derivadas = [...grupos[DERIVADAS_OG], ...grupos[DERIVADAS_CAPA]];
  const aRemover = INCLUIR_TODAS ? unused : derivadas;

  if (!APPLY) {
    console.log(`Nada foi apagado.`);
    console.log(`  --apply                             remove ${derivadas.length} derivadas`);
    console.log(`  --apply --incluir-nao-referenciadas remove as ${unused.length}, inclusive as a revisar`);
    return;
  }

  if (aRemover.length === 0) {
    console.log("Nenhuma derivada a remover.");
    return;
  }

  const { error } = await supabase.storage.from(BUCKET).remove(aRemover);
  if (error) throw error;
  console.log(`${aRemover.length} arquivos removidos.`);
  if (!INCLUIR_TODAS && grupos[A_REVISAR].length > 0) {
    console.log(`${grupos[A_REVISAR].length} mantidos: podem ser imagens ainda não usadas.`);
  }
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
