/**
 * Client-side Image Optimization and Resizing Utilities
 * - Max 1600px on largest dimension
 * - WebP / JPEG compression (~80% quality)
 * - Safe payload size limit (< 700KB for Firestore documents)
 * - OG Image (1200x630) crop generation
 */

export interface OptimizedImageResult {
  dataUrl: string;
  size: number;
  width: number;
  height: number;
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
