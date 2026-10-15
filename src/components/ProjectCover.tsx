import React from "react";
import type { Project } from "../types";
import { COVER_MOBILE_MAX_WIDTH, pickCoverArt, type CoverSlot } from "../lib/coverPack";
import { resolveImageSrc } from "../utils/imageDb";
import LocalImage from "./LocalImage";

interface ProjectCoverProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  project: Pick<Project, "coverPack" | "imageUrl">;
  slot: CoverSlot;
  /** Usa a arte 4:3 do pacote no celular. Só faz sentido no cartão, cujo quadro acompanha (cardFrameClass). */
  mobile?: boolean;
}

/**
 * Capa de um projeto num lugar do site.
 *
 * Com pacote de capas, mostra a arte desenhada para o lugar — a escura só no
 * tema escuro, e a 4:3 no celular quando pedida. Sem pacote, a capa de sempre.
 * As duas versões de tema ficam no HTML e o CSS escolhe (`.cover-art-*` em
 * index.css): o tema é uma classe no <html>, que a mídia do <picture> não vê.
 * A que está escondida não é baixada, por causa do `loading="lazy"`.
 */
export default function ProjectCover({ project, slot, mobile = false, className, sizes, alt, ...img }: ProjectCoverProps) {
  const art = pickCoverArt(project.coverPack, slot);
  if (!art) {
    return project.imageUrl ? <LocalImage src={project.imageUrl} alt={alt} sizes={sizes} className={className} {...img} /> : null;
  }

  const small = mobile && slot === "card" ? project.coverPack?.cardMobile : undefined;
  const light = { main: art.light, small: small?.light };
  const dark = { main: art.dark ?? art.light, small: small?.dark ?? small?.light };
  const sameInBoth = light.main === dark.main && light.small === dark.small;
  const variant = (sources: typeof light, theme?: "light" | "dark") => (
    <picture key={theme || "both"} className={theme ? `cover-art cover-art-${theme}` : "cover-art"}>
      {sources.small && <source media={`(max-width: ${COVER_MOBILE_MAX_WIDTH}px)`} srcSet={resolveImageSrc(sources.small)} />}
      <img
        src={resolveImageSrc(sources.main)}
        alt={alt}
        loading="lazy"
        decoding="async"
        {...img}
        className={className}
        onError={(event) => {
          // Arquivo sumido do Storage: melhor o fundo do quadro que o ícone quebrado.
          event.currentTarget.style.visibility = "hidden";
          img.onError?.(event);
        }}
      />
    </picture>
  );

  return sameInBoth ? variant(light) : <>{variant(light, "light")}{variant(dark, "dark")}</>;
}
