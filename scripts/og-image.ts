/**
 * Gera `public/og-home.jpg`: a imagem que aparece quando alguém compartilha
 * o link do site.
 *
 * A arte repete a abertura da home — nome, título, retrato e o traço de
 * sinal — com os dados publicados do perfil.
 *
 * Fica fora do build de propósito: precisa de um Chromium (o do Playwright)
 * e das fontes do Google Fonts, que a máquina de build da Vercel não tem.
 * Rode de novo quando trocar a foto, o nome ou o título:
 *
 *   npm run og
 */
import "dotenv/config";
import path from "node:path";
import { chromium } from "@playwright/test";
import { fetchPublishedContent } from "./fetchPublishedContent";
import { initialResumeData } from "../src/data/initialData";
import { marcasDoEixo, tracarPulso } from "../src/lib/pulso";
import { SHARE_IMAGE_PATH, SHARE_IMAGE_SIZE } from "../src/lib/siteMeta";

const { width: LARGURA, height: ALTURA } = SHARE_IMAGE_SIZE;
const TRACO_ALTURA = 150;
const TRACO_TOPO = 392;
/** O pulso em repouso, na mesma fração da largura que na home. */
const CENTRO = LARGURA * 0.7;

const origin = (process.env.VITE_SUPABASE_URL || "").trim().replace(/\/(rest|auth|storage|realtime)\/v1\/?$/, "").replace(/\/+$/, "");
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const dados = origin && anonKey ? await fetchPublishedContent(origin, anonKey) : initialResumeData;
const { name, title, avatarUrl } = dados.profile;

const foto = avatarUrl?.startsWith("db:")
  ? origin && `${origin}/storage/v1/object/public/images/${avatarUrl.slice(3)}`
  : avatarUrl;
const site = (process.env.VITE_SITE_URL || "https://pedroazara.vercel.app").replace(/^https?:\/\//, "").replace(/\/+$/, "");

const escapar = (texto: string) =>
  texto.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const tituloPartes = (title || "")
  .split("|")
  .map((parte) => parte.trim())
  .filter(Boolean);

const { portadora, superior, inferior } = tracarPulso(LARGURA, TRACO_ALTURA, CENTRO);
const meio = TRACO_ALTURA / 2;
const marcas = marcasDoEixo(LARGURA)
  .map(({ x, meia }) => `<line x1="${x}" x2="${x}" y1="${meio - meia}" y2="${meio + meia}" />`)
  .join("");

// Cores de index.css, tema claro: papel, tinta, tinta suave, borda e acento.
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Plus+Jakarta+Sans:wght@800&display=block" />
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: ${LARGURA}px; height: ${ALTURA}px; overflow: hidden; position: relative; background: #f8fafc; font-family: Inter, sans-serif; }
  .topo { position: absolute; left: 80px; right: 80px; top: 64px; display: flex; align-items: flex-end; justify-content: space-between; gap: 48px; }
  h1 { font: 800 80px/0.92 "Plus Jakarta Sans", sans-serif; letter-spacing: -0.035em; color: #0f172a; text-wrap: balance; }
  .titulo { margin-top: 22px; font-size: 28px; line-height: 1.3; color: #475569; }
  .titulo span { display: block; }
  .foto { width: 220px; height: 220px; flex: none; border-radius: 28px; overflow: hidden; background: #f1f5f9; box-shadow: 0 0 0 1px #e2e8f0; }
  .foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
  svg { position: absolute; left: 0; top: ${TRACO_TOPO}px; }
  .site { position: absolute; left: 80px; bottom: 50px; font-size: 24px; font-weight: 500; color: #64748b; }
</style>
</head>
<body>
  <div class="topo">
    <div>
      <h1>${escapar(name || "")}</h1>
      ${tituloPartes.length ? `<p class="titulo">${tituloPartes.map((p) => `<span>${escapar(p)}</span>`).join("")}</p>` : ""}
    </div>
    ${foto ? `<div class="foto"><img src="${escapar(foto)}" alt="" /></div>` : ""}
  </div>
  <svg width="${LARGURA}" height="${TRACO_ALTURA}" viewBox="0 0 ${LARGURA} ${TRACO_ALTURA}">
    <g stroke="#cbd5e1" stroke-width="1">${marcas}</g>
    <g fill="none" stroke="#4f46e5" stroke-opacity="0.4" stroke-width="1.25" stroke-dasharray="2 4">
      <path d="${superior}" /><path d="${inferior}" />
    </g>
    <path d="${portadora}" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
  </svg>
  <p class="site">${escapar(site)}</p>
</body>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: LARGURA, height: ALTURA } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
  });
  const destino = path.join(process.cwd(), "public", SHARE_IMAGE_PATH.replace(/^\//, ""));
  await page.screenshot({ path: destino, type: "jpeg", quality: 90 });
  console.log(`Imagem gerada: ${path.relative(process.cwd(), destino)}`);
} finally {
  await browser.close();
}
