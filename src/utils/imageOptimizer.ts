/**
 * Client-side Image Optimization and Resizing Utilities
 * - Max 1600px on largest dimension
 * - WebP / JPEG compression (~80% quality)
 * - Safe payload size limit (< 700KB)
 * - OG Image (1200x630) crop generation
 */

export interface OptimizedImageResult {
  dataUrl: string;
  size: number;
  width: number;
  height: number;
}

export interface FormatPreservedImageResult {
  dataUrl: string;
  extension: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

/**
 * Processes an image File while preserving its exact original format (PNG stays PNG, JPG stays JPG, GIF stays GIF, SVG stays SVG).
 */
export async function processImagePreservingFormat(
  file: File,
  maxDimension: number = 1600
): Promise<FormatPreservedImageResult> {
  const mimeType = file.type || "image/png";
  
  // Extension mapping
  let extension = "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    extension = "jpg";
  } else if (mimeType.includes("gif")) {
    extension = "gif";
  } else if (mimeType.includes("webp")) {
    extension = "webp";
  } else if (mimeType.includes("svg")) {
    extension = "svg";
  } else if (mimeType.includes("png")) {
    extension = "png";
  } else {
    // try reading extension from file name
    const match = file.name.match(/\.([a-zA-Z0-9]+)$/);
    if (match) {
      extension = match[1].toLowerCase();
    }
  }

  /**
   * Animação e vetor saem daqui intactos.
   *
   * Redesenhar um GIF no canvas o deixaria parado no primeiro quadro, e um SVG
   * não tem tamanho fixo para reduzir — ele já se adapta a qualquer largura.
   */
  if (extension === "gif" || extension === "svg") {
    return lerComoEsta(file, extension, mimeType);
  }

  const dataUrlOriginal = await lerDataUrl(file);
  const img = await carregarImagem(dataUrlOriginal);

  /**
   * Reduz pela dimensão, não pelo peso.
   *
   * A regra anterior deixava passar intacto qualquer arquivo abaixo de 1,2 MB
   * — o que media a coisa errada. Uma captura de tela de 3.000 px de largura
   * costuma pesar menos que isso e ia inteira para a nuvem, para ser exibida
   * num cartão de 300 px. Já uma foto de 1.400 px pode passar de 1,2 MB sem
   * ter o que cortar em tamanho.
   *
   * Quem já cabe no limite volta com os próprios bytes: passar pelo canvas
   * sem necessidade recomprimiria a imagem e, no caso do WebP, a devolveria
   * como PNG — maior do que entrou.
   */
  if (img.width <= maxDimension && img.height <= maxDimension) {
    return { dataUrl: dataUrlOriginal, extension, mimeType, size: file.size, width: img.width, height: img.height };
  }

  const escala = maxDimension / Math.max(img.width, img.height);
  const width = Math.round(img.width * escala);
  const height = Math.round(img.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível inicializar o Canvas.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  // O formato de saída acompanha o de entrada: um WebP que virasse PNG
  // desfaria a economia que motivou a redução.
  const targetFormat =
    extension === "jpg" ? "image/jpeg" : extension === "webp" ? "image/webp" : "image/png";
  const dataUrl = canvas.toDataURL(targetFormat, 0.88);

  return {
    dataUrl,
    extension,
    mimeType: targetFormat,
    size: Math.round((dataUrl.length * 3) / 4),
    width,
    height,
  };
}

/** Lê o arquivo como data URL, sem tocar no conteúdo. */
function lerDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultado = e.target?.result;
      if (typeof resultado === "string") resolve(resultado);
      else reject(new Error("Erro ao ler arquivo da imagem."));
    };
    reader.onerror = () => reject(new Error("Erro na leitura do arquivo."));
    reader.readAsDataURL(file);
  });
}

/** Devolve o arquivo exatamente como veio. */
async function lerComoEsta(
  file: File,
  extension: string,
  mimeType: string
): Promise<FormatPreservedImageResult> {
  return { dataUrl: await lerDataUrl(file), extension, mimeType, size: file.size };
}

/** Carrega a imagem para poder medir e desenhar. */
function carregarImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Erro ao processar imagem no Canvas."));
    img.src = dataUrl;
  });
}


/**
 * Optimizes an image File or Data URL to fit within max 1600px and compress to ~80% quality WebP.
 */
export async function optimizeImage(
  input: File | string,
  maxDimension: number = 1600,
  quality: number = 0.8
): Promise<OptimizedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const processCanvas = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível inicializar o contexto 2D do Canvas."));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first, fallback to jpeg
        let format = "image/webp";
        let dataUrl = canvas.toDataURL(format, quality);

        // If WebP is not supported or output string didn't compress well, fallback
        if (!dataUrl.startsWith("data:image/webp")) {
          format = "image/jpeg";
          dataUrl = canvas.toDataURL(format, quality);
        }

        let size = Math.round((dataUrl.length * 3) / 4);

        // Safety loop: if size is still > 700KB, reduce quality iteratively
        let currentQuality = quality;
        while (size > 700000 && currentQuality > 0.3) {
          currentQuality -= 0.15;
          dataUrl = canvas.toDataURL(format, currentQuality);
          size = Math.round((dataUrl.length * 3) / 4);
        }

        resolve({
          dataUrl,
          size,
          width,
          height,
        });
      } catch (err) {
        reject(new Error(`Erro ao otimizar imagem: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    img.onload = processCanvas;
    img.onerror = () => reject(new Error("Falha ao carregar arquivo de imagem para otimização."));

    if (typeof input === "string") {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error("Erro ao ler o arquivo de imagem."));
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo selecionado."));
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Generates a 1200x630 cropped version for og:image meta tag standard
 */
export async function generateOgImage(input: File | string): Promise<OptimizedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const targetWidth = 1200;
        const targetHeight = 630;
        const targetAspect = targetWidth / targetHeight;
        const srcAspect = img.width / img.height;

        let srcX = 0;
        let srcY = 0;
        let srcWidth = img.width;
        let srcHeight = img.height;

        if (srcAspect > targetAspect) {
          srcWidth = img.height * targetAspect;
          srcX = (img.width - srcWidth) / 2;
        } else {
          srcHeight = img.width / targetAspect;
          srcY = (img.height - srcHeight) / 2;
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Falha no contexto do Canvas para imagem OG."));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);

        const dataUrl = canvas.toDataURL("image/webp", 0.82);
        const size = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          size,
          width: targetWidth,
          height: targetHeight,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error("Erro ao carregar imagem para gerar OG image."));

    if (typeof input === "string") {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) img.src = e.target.result as string;
      };
      reader.readAsDataURL(input);
    }
  });
}
