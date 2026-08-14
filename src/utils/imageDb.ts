import { supabase, isSupabaseConfigured, IMAGES_BUCKET } from "../lib/supabase";

/**
 * Banco de imagens sobre o Supabase Storage.
 *
 * As imagens são arquivos de verdade num bucket público, e a URL pública é
 * *determinística* — dá para montá-la a partir do caminho, sem consulta. Isso
 * dispensa cache local e sincronização.
 *
 * Organização em pastas:
 *
 *   projects/<codigo>/imagem.webp   imagens de um projeto específico
 *   geral/imagem.webp               avatar, capas e imagens do site
 *
 * O conteúdo referencia uma imagem pelo caminho completo (`db:projects/yolo/a.webp`).
 * Arquivos soltos na raiz continuam válidos — é onde as imagens antigas estavam.
 */

/** Pasta das imagens que não pertencem a um projeto específico. */
export const GENERAL_FOLDER = "geral";

/** Pasta de um projeto, a partir do seu código. */
export function projectFolder(codigo: string): string {
  return `projects/${codigo}`;
}

/** Junta pasta e nome de arquivo num caminho do bucket. */
export function joinPath(folder: string, fileName: string): string {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  return cleanFolder ? `${cleanFolder}/${fileName}` : fileName;
}

/** Só o nome do arquivo, sem a pasta. Para exibição. */
export function fileNameOf(path: string): string {
  return path.split("/").pop() || path;
}

/** Só a pasta de um caminho; string vazia quando o arquivo está na raiz. */
export function folderOf(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

export interface StoredImage {
  /** Caminho completo dentro do bucket — é o que vai na referência `db:`. */
  name: string;
  /** URL pública servida pelo CDN do Supabase. */
  url: string;
  size: number;
  addedAt: number;
}

/** Extrai o mime type de uma data URL (`data:image/webp;base64,...`). */
function mimeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;,]+)[;,]/.exec(dataUrl);
  return match ? match[1] : "application/octet-stream";
}

/** Converte uma data URL em Blob para envio como arquivo binário. */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * URL pública de uma imagem do bucket. Síncrona e sem rede: o Supabase monta a
 * URL a partir do caminho do arquivo.
 */
export function getSyncImage(path: string): string | null {
  if (!isSupabaseConfigured || !path) return null;
  const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl || null;
}

/**
 * Mantida por compatibilidade com quem já chamava a versão assíncrona.
 * Hoje resolve imediatamente, já que a URL é determinística.
 */
export async function getImage(path: string): Promise<string | null> {
  return getSyncImage(path);
}

/**
 * Converte um valor de imagem do conteúdo numa URL utilizável.
 *
 * As imagens do banco são referenciadas como `db:caminho/arquivo.webp`; URLs
 * comuns passam direto. Use sempre que for montar um `src` ou um `url()` de CSS
 * fora do componente `LocalImage` — um `db:` cru vira `ERR_UNKNOWN_URL_SCHEME`.
 */
export function resolveImageSrc(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (!src.startsWith("db:")) return src;
  return getSyncImage(src.slice(3)) || undefined;
}

/**
 * Envia uma imagem para o bucket. Recebe uma data URL (é o que os utilitários
 * de otimização produzem) e a converte em arquivo binário antes de subir.
 * `path` pode incluir pastas. Sobrescreve caso o caminho já exista.
 */
export async function saveImage(path: string, dataUrl: string, _size: number): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível enviar imagens.");
  }

  const blob = await dataUrlToBlob(dataUrl);

  const { error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(path, blob, {
      contentType: mimeFromDataUrl(dataUrl),
      upsert: true,
      cacheControl: "31536000", // um ano: o caminho é o identificador
    });

  if (error) throw error;
}

/** Remove a imagem do bucket. */
export async function deleteImage(path: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível remover imagens.");
  }

  const { error } = await supabase.storage.from(IMAGES_BUCKET).remove([path]);
  if (error) throw error;
}

/** Move uma imagem para outro caminho, preservando o conteúdo. */
export async function moveImage(fromPath: string, toPath: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível mover imagens.");
  }

  const { error } = await supabase.storage.from(IMAGES_BUCKET).move(fromPath, toPath);
  if (error) throw error;
}

/**
 * Entradas diretamente sob um prefixo. O Supabase devolve pastas como itens
 * sem `id`; separamos os dois tipos aqui.
 */
async function listEntries(prefix: string): Promise<{ files: StoredImage[]; folders: string[] }> {
  const { data, error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .list(prefix, {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) throw error;
  if (!data) return { files: [], folders: [] };

  const files: StoredImage[] = [];
  const folders: string[] = [];

  for (const item of data) {
    // Marcador oculto que o Supabase cria em pastas vazias.
    if (!item.name || item.name === ".emptyFolderPlaceholder") continue;

    const path = joinPath(prefix, item.name);

    if (item.id === null) {
      folders.push(path);
      continue;
    }

    files.push({
      name: path,
      url: getSyncImage(path) || "",
      size: (item.metadata as { size?: number } | null)?.size ?? 0,
      addedAt: item.created_at ? new Date(item.created_at).getTime() : 0,
    });
  }

  return { files, folders };
}

/** Subpastas diretamente sob um prefixo. */
export async function listFolders(prefix = ""): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const { folders } = await listEntries(prefix);
  return folders;
}

/**
 * Lista imagens do bucket, da mais recente para a mais antiga.
 *
 * Sem argumento, percorre as pastas e devolve tudo — é o que o banco global
 * mostra. Com um prefixo (`projects/yolocraft`), devolve só o que está ali,
 * que é o modo usado pelo editor de cada projeto.
 *
 * Traz apenas metadados; os bytes só descem quando um `<img>` aponta para a URL.
 */
export async function listImages(prefix?: string): Promise<StoredImage[]> {
  if (!isSupabaseConfigured) return [];

  if (prefix !== undefined) {
    const { files } = await listEntries(prefix);
    return files.sort((a, b) => b.addedAt - a.addedAt);
  }

  // Varredura completa. A profundidade é limitada porque a convenção de pastas
  // tem no máximo dois níveis (`projects/<codigo>/`); o limite evita que uma
  // estrutura inesperada vire uma varredura sem fim.
  const MAX_DEPTH = 3;
  const all: StoredImage[] = [];

  async function walk(currentPrefix: string, depth: number): Promise<void> {
    const { files, folders } = await listEntries(currentPrefix);
    all.push(...files);
    if (depth >= MAX_DEPTH) return;
    await Promise.all(folders.map((folder) => walk(folder, depth + 1)));
  }

  await walk("", 0);

  return all.sort((a, b) => b.addedAt - a.addedAt);
}
