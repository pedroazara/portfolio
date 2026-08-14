import { supabase, isSupabaseConfigured, IMAGES_BUCKET } from "../lib/supabase";

/**
 * Banco de imagens sobre o Supabase Storage.
 *
 * Diferença central em relação à versão anterior (Firestore + IndexedDB):
 * as imagens são arquivos de verdade num bucket público, e a URL pública é
 * *determinística* — dá para montá-la a partir do nome, sem nenhuma consulta.
 * Isso elimina o cache local, a sincronização bidirecional e o download do
 * conteúdo de todas as imagens a cada carregamento de página.
 */

export interface StoredImage {
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
 * URL a partir do nome do arquivo.
 */
export function getSyncImage(name: string): string | null {
  if (!isSupabaseConfigured || !name) return null;
  const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(name);
  return data.publicUrl || null;
}

/**
 * Mantida por compatibilidade com quem já chamava a versão assíncrona.
 * Hoje resolve imediatamente, já que a URL é determinística.
 */
export async function getImage(name: string): Promise<string | null> {
  return getSyncImage(name);
}

/**
 * Envia uma imagem para o bucket. Recebe uma data URL (é o que os utilitários
 * de otimização produzem) e a converte em arquivo binário antes de subir.
 * Sobrescreve caso já exista uma imagem com o mesmo nome.
 */
export async function saveImage(name: string, dataUrl: string, _size: number): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível enviar imagens.");
  }

  const blob = await dataUrlToBlob(dataUrl);

  const { error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(name, blob, {
      contentType: mimeFromDataUrl(dataUrl),
      upsert: true,
      cacheControl: "31536000", // um ano: o nome do arquivo é o identificador
    });

  if (error) throw error;
}

/** Remove a imagem do bucket. */
export async function deleteImage(name: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não configurado — impossível remover imagens.");
  }

  const { error } = await supabase.storage.from(IMAGES_BUCKET).remove([name]);
  if (error) throw error;
}

/**
 * Lista as imagens do bucket, da mais recente para a mais antiga.
 *
 * Traz apenas metadados — nome, tamanho e data. O conteúdo de cada imagem só
 * é baixado pelo navegador quando um `<img>` aponta para a URL, e aí com cache
 * de CDN. Antes, esta função baixava o base64 de todas as imagens de uma vez.
 */
export async function listImages(): Promise<StoredImage[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .list("", {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) throw error;
  if (!data) return [];

  return data
    // O Supabase cria um marcador oculto em pastas vazias; não é uma imagem.
    .filter((item) => item.name && item.name !== ".emptyFolderPlaceholder")
    .map((item) => ({
      name: item.name,
      url: getSyncImage(item.name) || "",
      size: (item.metadata as { size?: number } | null)?.size ?? 0,
      addedAt: item.created_at ? new Date(item.created_at).getTime() : 0,
    }));
}
