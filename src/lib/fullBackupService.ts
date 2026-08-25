import JSZip from "jszip";
import { ResumeData } from "../types";
import { supabase, isSupabaseConfigured, IMAGES_BUCKET } from "./supabase";
import { listImages } from "../utils/imageDb";

/**
 * Backup completo: conteúdo do portfólio + todas as imagens do bucket,
 * compactados num único .zip guardado no bucket privado `full-backups`.
 *
 * Ao contrário do histórico em `portfolio_backups` (só o JSON, criado via
 * pg_cron independente de alguém abrir o site), este backup só roda quando
 * há uma sessão de admin no navegador — baixar e recompactar cada imagem
 * exige transferir os bytes de verdade, o que a função em SQL do outro
 * histórico não consegue fazer. Por isso ele é disparado manualmente pelo
 * botão "Criar backup completo agora" e, automaticamente, uma vez por dia
 * quando o admin loga (ver `maybeRunDailyFullBackup`).
 */

export const FULL_BACKUPS_BUCKET = "full-backups";

/** Mantém só os N backups completos mais recentes — cada um pesa o tamanho de todas as imagens. */
const RETENTION = 10;

const EXTENSION_MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
};

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[ext] ?? "application/octet-stream";
}

export interface FullBackupEntry {
  name: string;
  createdAt: string;
  sizeBytes: number;
}

/** Lista os backups completos, do mais novo para o mais antigo. */
export async function listFullBackups(): Promise<FullBackupEntry[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase.storage
    .from(FULL_BACKUPS_BUCKET)
    .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  if (error) throw error;

  return (data ?? [])
    .filter((f) => f.name.endsWith(".zip"))
    .map((f) => ({
      name: f.name,
      createdAt: f.created_at ?? "",
      sizeBytes: (f.metadata as { size?: number } | null)?.size ?? 0,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Remove os backups completos além dos `RETENTION` mais recentes. */
async function trimOldFullBackups(): Promise<void> {
  const backups = await listFullBackups();
  const stale = backups.slice(RETENTION).map((b) => b.name);
  if (stale.length === 0) return;

  const { error } = await supabase.storage.from(FULL_BACKUPS_BUCKET).remove(stale);
  if (error) throw error;
}

/**
 * Monta e envia um backup completo: `content.json` com o conteúdo atual +
 * uma cópia de cada imagem do bucket, dentro de `images/<mesmo caminho>`.
 * `onProgress` recebe mensagens curtas para exibir numa barra de status.
 */
export async function createFullBackup(
  resumeData: ResumeData,
  onProgress?: (message: string) => void
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível criar backup completo.");
  }

  onProgress?.("Listando imagens…");
  const images = await listImages(undefined, { includeCrops: true });

  const zip = new JSZip();
  zip.file("content.json", JSON.stringify(resumeData, null, 2));

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    onProgress?.(`Baixando imagem ${i + 1}/${images.length}…`);
    try {
      const response = await fetch(img.url);
      if (!response.ok) continue;
      const blob = await response.blob();
      zip.file(`images/${img.name}`, blob);
    } catch (err) {
      // Uma imagem inacessível não deve travar o backup inteiro.
      console.warn(`Falha ao baixar imagem para backup: ${img.name}`, err);
    }
  }

  onProgress?.("Compactando…");
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

  const fileName = `full-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;

  onProgress?.("Enviando para a nuvem…");
  const { error } = await supabase.storage.from(FULL_BACKUPS_BUCKET).upload(fileName, zipBlob, {
    contentType: "application/zip",
    upsert: false,
  });
  if (error) throw error;

  onProgress?.("Limpando backups antigos…");
  await trimOldFullBackups();
}

/** Apaga um backup completo específico — cada um pesa o tamanho de todas as imagens, então às vezes vale liberar espaço antes dos 10 da retenção automática. */
export async function deleteFullBackup(name: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível apagar backup.");
  }
  const { error } = await supabase.storage.from(FULL_BACKUPS_BUCKET).remove([name]);
  if (error) throw error;
}

/** Baixa os bytes de um backup completo (o próprio .zip). */
export async function downloadFullBackup(name: string): Promise<Blob> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível baixar backup.");
  }
  const { data, error } = await supabase.storage.from(FULL_BACKUPS_BUCKET).download(name);
  if (error) throw error;
  return data;
}

/**
 * Restaura um backup completo: devolve o `content.json` já interpretado (o
 * chamador aplica isso ao estado do app, que por sua vez dispara a gravação
 * na tabela `portfolio` pelo fluxo normal) e reenvia cada imagem ao bucket
 * `images`, sobrescrevendo o que já existir no mesmo caminho.
 */
export async function restoreFullBackup(
  name: string,
  onProgress?: (message: string) => void
): Promise<ResumeData> {
  onProgress?.("Baixando backup…");
  const blob = await downloadFullBackup(name);

  onProgress?.("Descompactando…");
  const zip = await JSZip.loadAsync(blob);

  const contentEntry = zip.file("content.json");
  if (!contentEntry) {
    throw new Error("Backup inválido: content.json não encontrado dentro do .zip.");
  }
  const data = JSON.parse(await contentEntry.async("string")) as ResumeData;

  const imagePaths = Object.keys(zip.files).filter(
    (path) => path.startsWith("images/") && !zip.files[path].dir
  );

  for (let i = 0; i < imagePaths.length; i++) {
    const fullPath = imagePaths[i];
    const path = fullPath.slice("images/".length);
    onProgress?.(`Restaurando imagem ${i + 1}/${imagePaths.length}…`);

    const fileBlob = await zip.files[fullPath].async("blob");
    const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, fileBlob, {
      contentType: mimeFromPath(path),
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) throw error;
  }

  return data;
}

const LAST_FULL_BACKUP_KEY = "portfolio_last_full_backup_check";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Dispara um backup completo em segundo plano no máximo uma vez por dia,
 * por sessão de admin autenticado. É o mais perto de "automático" que dá
 * para chegar sem um servidor com credenciais elevadas rodando 24h: como
 * cada backup completo baixa e recompacta todas as imagens de verdade, ele
 * só pode rodar onde há uma sessão logada — aqui, no navegador do admin.
 *
 * Silencioso por natureza: falha ou sucesso não devem interromper o uso do
 * painel, então erros só vão para o console.
 */
export function maybeRunDailyFullBackup(resumeData: ResumeData): void {
  if (!isSupabaseConfigured) return;

  const last = Number(localStorage.getItem(LAST_FULL_BACKUP_KEY) || 0);
  if (Date.now() - last < ONE_DAY_MS) return;

  localStorage.setItem(LAST_FULL_BACKUP_KEY, String(Date.now()));

  createFullBackup(resumeData).catch((err) => {
    console.error("Backup completo automático falhou:", err);
    // Permite tentar de novo na próxima sessão em vez de esperar 24h.
    localStorage.removeItem(LAST_FULL_BACKUP_KEY);
  });
}
