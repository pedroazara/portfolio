import sharp from "sharp";
export const imageWidths = [320, 640, 960, 1600];
export function validImagePath(path: string) {
  return path.length < 500 && !path.split("/").some(p => !p || p === "." || p === "..") && !/[\\\x00-\x1f?#]/.test(path) && /\.(png|jpe?g|webp)$/i.test(path);
}
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).end();
  const imagePath = String(req.query.path || "");
  const width = Number(req.query.w);
  if (!validImagePath(imagePath) || !imageWidths.includes(width)) return res.status(400).end();
  const origin = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/(rest|auth|storage)\/v1\/?$/, "").replace(/\/$/, "");
  if (!origin) return res.status(503).end();
  try {
    const source = await fetch(`${origin}/storage/v1/object/public/images/${imagePath.split("/").map(encodeURIComponent).join("/")}`, { signal: AbortSignal.timeout(10000), redirect: "error" });
    if (!source.ok || !source.body) return res.status(404).end();
    if (Number(source.headers.get("content-length")) > 15000000) return res.status(413).end();
    const reader = source.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 15000000) { await reader.cancel(); return res.status(413).end(); } chunks.push(part.value); }
    const output = await sharp(Buffer.concat(chunks), { limitInputPixels: 25000000 }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).end(output);
  } catch { return res.status(502).end(); }
}
