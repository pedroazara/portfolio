/**
 * O que aparece quando alguém compartilha o link do site — WhatsApp, LinkedIn,
 * Discord, buscadores.
 *
 * A descrição da home era a apresentação inteira do perfil: mil caracteres
 * que toda rede corta no meio da frase. Esta é curta de propósito (as prévias
 * mostram de 150 a 200 caracteres) e diz o que o link tem.
 */
export const SITE_DESCRIPTION = {
  pt: "Estudante de Engenharia Física na UFLA. Projetos em instrumentação, eletrônica, visão computacional e simulação, com currículo e blog.",
  en: "Engineering Physics student at UFLA. Projects in instrumentation, electronics, computer vision and simulation, plus resume and blog.",
} as const;

/**
 * Imagem de compartilhamento das páginas sem imagem própria. Gerada por
 * `npm run og` (scripts/og-image.ts) e versionada em `public/`.
 *
 * JPEG, e não PNG: com a foto, o PNG passa de 300 kB, e o WhatsApp deixa de
 * mostrar a prévia acima disso. O nome muda quando a arte muda, para as redes
 * não reaproveitarem a versão antiga que guardaram em cache.
 */
export const SHARE_IMAGE_PATH = "/og-home.jpg";
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;
