import fs from "node:fs/promises";
import path from "node:path";
import type { ResumeData } from "../../src/types";
import { parseResumeData } from "../../src/lib/contentSchema";
import { editHeader, type EditInfo } from "./editLog";
import { REPO_ROOT } from "./env";
import { getSupabase } from "./supabase";

/**
 * Leitura e gravação do documento único do portfólio (`portfolio.main`).
 *
 * O site guarda tudo — perfil, projetos, posts — num só JSON, e o painel grava
 * o documento inteiro a cada salvamento. O servidor MCP segue as mesmas
 * regras do painel (`src/lib/dataService.ts`):
 *
 *   - valida com o mesmo esquema antes de gravar (`parseResumeData`);
 *   - grava condicionado ao `updated_at` lido, para não apagar o que o painel
 *     salvou no meio-tempo. Se a linha mudou, relê e reaplica a alteração.
 */

const TABLE = "portfolio";
const ROW_ID = "main";
const MAX_ATTEMPTS = 3;

/** Cópias locais do documento anterior a cada gravação — o "desfazer". */
export const HISTORY_DIR = path.join(REPO_ROOT, "mcp", ".history");
const HISTORY_LIMIT = 50;

export interface PortfolioSnapshot {
  data: ResumeData;
  version: string;
}

export async function readPortfolio(): Promise<PortfolioSnapshot> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("data,updated_at")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível ler o portfólio: ${error.message}`);
  if (!data?.data) {
    throw new Error("O portfólio ainda não existe no Supabase. Salve-o uma vez pelo painel do site.");
  }
  return { data: parseResumeData(data.data), version: data.updated_at as string };
}

export interface Mutation<T> {
  result: T;
  /** `false` quando a alteração não muda nada — então nada é gravado. */
  changed: boolean;
}

export interface UpdateOutcome<T> {
  result: T;
  written: boolean;
  /** Arquivo com o documento como estava antes da gravação. */
  backupPath?: string;
}

/**
 * Aplica `mutate` sobre a versão atual e grava.
 *
 * `mutate` recebe uma cópia do documento e pode alterá-la à vontade. Ela pode
 * rodar mais de uma vez (se o painel gravar entre a leitura e a escrita), então
 * não deve ter efeitos fora do documento — envios de imagem acontecem antes.
 *
 * `edit` identifica a alteração no registro de edições do painel.
 * Com `dryRun`, nada é gravado: serve para mostrar o que mudaria.
 */
export async function updatePortfolio<T>(
  edit: EditInfo,
  mutate: (draft: ResumeData) => Mutation<T>,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<UpdateOutcome<T>> {
  const supabase = await getSupabase();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const current = await readPortfolio();
    const draft = structuredClone(current.data);
    const { result, changed } = mutate(draft);
    if (!changed || dryRun) return { result, written: false };

    const next = parseResumeData(draft);
    const { data: rows, error } = await supabase
      .from(TABLE)
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq("id", ROW_ID)
      .eq("updated_at", current.version)
      .select("updated_at")
      .setHeader("x-portfolio-edit", editHeader(edit));
    if (error) throw new Error(`Não foi possível salvar o portfólio: ${error.message}`);
    if (!rows?.length) continue; // outra gravação venceu; relê e tenta de novo

    const backupPath = await saveBackup(`${edit.tool}-${edit.target}`, current.data).catch((err) => {
      console.error("Cópia local do documento anterior falhou:", err);
      return undefined;
    });
    return { result, written: true, backupPath };
  }

  throw new Error("O portfólio foi alterado várias vezes durante a gravação. Tente de novo.");
}

async function saveBackup(label: string, data: ResumeData): Promise<string> {
  await fs.mkdir(HISTORY_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeLabel = label.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80);
  const file = path.join(HISTORY_DIR, `${stamp}_${safeLabel}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2));

  const old = (await fs.readdir(HISTORY_DIR)).filter((f) => f.endsWith(".json")).sort().slice(0, -HISTORY_LIMIT);
  await Promise.all(old.map((f) => fs.rm(path.join(HISTORY_DIR, f), { force: true })));
  return file;
}

/** Cópias locais disponíveis, da mais recente para a mais antiga. */
export async function listBackups(): Promise<string[]> {
  const files = await fs.readdir(HISTORY_DIR).catch(() => [] as string[]);
  return files.filter((f) => f.endsWith(".json")).sort().reverse();
}

/**
 * Lê uma cópia local pelo nome do arquivo ou pelo `backupPath` devolvido numa
 * gravação. Só arquivos da pasta de histórico: o nome é reduzido ao final.
 */
export async function readBackup(nameOrPath: string): Promise<ResumeData> {
  const file = path.join(HISTORY_DIR, path.basename(nameOrPath));
  const raw = await fs.readFile(file, "utf8").catch(() => {
    throw new Error(`Cópia "${nameOrPath}" não encontrada. Veja as disponíveis com list_backups.`);
  });
  return parseResumeData(JSON.parse(raw));
}
