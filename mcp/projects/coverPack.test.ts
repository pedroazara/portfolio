import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildCoverPack, coverPackRefs, inspectSvg, planCoverPack, readPackSource, renderOgImage, type PackFile } from "./coverPack";

function svg(width: number, height: number, fill: string, extra = ""): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
      `<defs><linearGradient id="g"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="#7055d8"/></linearGradient></defs>` +
      `<rect width="${width}" height="${height}" fill="${fill}"/><circle cx="${width / 2}" cy="${height / 2}" r="${height / 4}" fill="url(#g)"/>${extra}</svg>`,
  );
}

const LIGHT = "#f7f7fb";
const DARK = "#171b2a";
const fullPack = (): PackFile[] => [
  { name: "card-light.svg", body: svg(1600, 900, LIGHT) },
  { name: "card-dark.svg", body: svg(1600, 900, DARK) },
  { name: "card-mobile-light.svg", body: svg(1200, 900, LIGHT) },
  { name: "card-mobile-dark.svg", body: svg(1200, 900, DARK) },
  { name: "hero-light.svg", body: svg(1600, 900, LIGHT) },
  { name: "hero-dark.svg", body: svg(1600, 900, DARK) },
  { name: "square-light.svg", body: svg(1200, 1200, LIGHT) },
  { name: "square-dark.svg", body: svg(1200, 1200, DARK) },
  { name: "og.svg", body: svg(1200, 630, LIGHT) },
  { name: "pack.json", body: Buffer.from(JSON.stringify({ projeto: "yolocraft" })) },
  { name: "prancha.html", body: Buffer.from("<html></html>") },
];

describe("conferência do pacote", () => {
  it("aceita o pacote completo sem avisos e lê o projeto do pack.json", async () => {
    const plan = await planCoverPack(fullPack());
    expect(plan.arts.map((a) => `${a.slot}/${a.theme ?? "-"}`).sort()).toEqual(
      ["card/dark", "card/light", "cardMobile/dark", "cardMobile/light", "hero/dark", "hero/light", "og/-", "square/dark", "square/light"],
    );
    expect(plan.warnings).toEqual([]);
    expect(plan.projeto).toBe("yolocraft");
    expect(plan.ignored).toEqual(["pack.json", "prancha.html"]);
  });

  it("pede o cartão claro, que é a base", async () => {
    await expect(planCoverPack([{ name: "hero-light.svg", body: svg(1600, 900, LIGHT) }])).rejects.toThrow(/Falta card-light/);
  });

  it("recusa nomes desconhecidos em vez de deixar a arte sumir", async () => {
    const files = [...fullPack(), { name: "card_dark.svg", body: svg(1600, 900, DARK) }];
    await expect(planCoverPack(files)).rejects.toThrow(/Nomes que não reconheço: card_dark\.svg/);
  });

  it("confere a proporção de cada lugar", async () => {
    const files = [{ name: "card-light.svg", body: svg(1600, 900, LIGHT) }, { name: "card-mobile-light.svg", body: svg(1600, 900, LIGHT) }];
    await expect(planCoverPack(files)).rejects.toThrow(/card-mobile-light\.svg: proporção 1600×900; o lugar pede 1200×900/);
  });

  it("avisa quando os temas parecem trocados", async () => {
    const files = [{ name: "card-light.svg", body: svg(1600, 900, DARK) }, { name: "card-dark.svg", body: svg(1600, 900, LIGHT) }];
    const plan = await planCoverPack(files);
    expect(plan.warnings.join("\n")).toMatch(/versão escura está mais clara que a clara/);
  });

  it("aceita PNG grande e avisa quando é pequeno", async () => {
    const png = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: LIGHT } }).png().toBuffer();
    const plan = await planCoverPack([
      { name: "card-light.png", body: await png(1600, 900) },
      { name: "square-light.png", body: await png(600, 600) },
    ]);
    expect(plan.arts).toHaveLength(2);
    expect(plan.warnings.join("\n")).toMatch(/square-light\.png: 600 px de largura/);
  });

  it("acha as artes dentro de uma subpasta do .zip", async () => {
    const zip = new JSZip();
    for (const file of fullPack()) zip.file(`yolocraft-capas/${file.name}`, file.body);
    zip.file("__MACOSX/yolocraft-capas/._card-light.svg", "lixo");
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "capas-"));
    const zipPath = path.join(dir, "capas.zip");
    await fs.writeFile(zipPath, await zip.generateAsync({ type: "nodebuffer" }));
    const files = await readPackSource(zipPath);
    expect(files.some((f) => f.name.includes("__MACOSX"))).toBe(false);
    const plan = await planCoverPack(files);
    expect(plan.arts).toHaveLength(9);
    await fs.rm(dir, { recursive: true });
  });
});

describe("SVG dentro de <img>", () => {
  const base = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">${inner}</svg>`;

  it("lê as medidas do viewBox e aceita gradientes e imagens embutidas", () => {
    expect(inspectSvg(base(`<rect fill="url(#g)"/><rect fill="url('#g')"/><image href="data:image/png;base64,AAAA"/>`), "a.svg")).toMatchObject({
      width: 1600,
      height: 900,
      warnings: [],
    });
  });

  it("recusa o que pode executar ou depende de arquivo de fora", () => {
    expect(() => inspectSvg(base("<script>alert(1)</script>"), "a.svg")).toThrow(/<script>/);
    expect(() => inspectSvg(base(`<rect onclick="x()"/>`), "a.svg")).toThrow(/atributos de evento/);
    expect(() => inspectSvg(base("<foreignObject><div/></foreignObject>"), "a.svg")).toThrow(/HTML embutido/);
    expect(() => inspectSvg(base(`<image href="https://exemplo.com/a.png"/>`), "a.svg")).toThrow(/arquivo externo/);
    expect(() => inspectSvg(base(`<style>@import url(https://fonts.googleapis.com/css2);</style>`), "a.svg")).toThrow(/de fora/);
    expect(() => inspectSvg(`<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`, "a.svg")).toThrow(/sem viewBox/);
  });

  it("avisa sobre texto, que perde a fonte dentro de <img>", () => {
    expect(inspectSvg(base("<text>YOLO</text>"), "a.svg").warnings[0]).toMatch(/tem <text>/);
  });
});

describe("prévia do link", () => {
  it("sai em JPEG 1200×630 de até 300 kB, mesmo a partir do cartão 16:9", async () => {
    const plan = await planCoverPack([{ name: "card-light.svg", body: svg(1600, 900, LIGHT) }]);
    expect(plan.warnings.join("\n")).toMatch(/Sem og\.svg/);
    const body = await renderOgImage(plan.arts[0]);
    const meta = await sharp(body).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 1200, 630]);
    expect(body.length).toBeLessThanOrEqual(300 * 1024);
  });
});

describe("montagem do coverPack", () => {
  it("junta temas por lugar e descarta lugar sem a versão clara", () => {
    const pack = buildCoverPack([
      { slot: "card", theme: "dark", ref: "db:c/card-dark.svg" },
      { slot: "card", theme: "light", ref: "db:c/card-light.svg" },
      { slot: "hero", theme: "dark", ref: "db:c/hero-dark.svg" },
      { slot: "og", ref: "db:c/og.jpg" },
    ]);
    expect(pack).toEqual({ card: { light: "db:c/card-light.svg", dark: "db:c/card-dark.svg" }, og: "db:c/og.jpg" });
    expect(coverPackRefs(pack)).toEqual(["db:c/card-light.svg", "db:c/card-dark.svg", "db:c/og.jpg"]);
  });
});
