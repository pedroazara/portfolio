import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { initialResumeData } from "../../src/data/initialData";
import type { ResumeData } from "../../src/types";
import { findImageUsage, replaceImageRef } from "../core/references";
import { applyEdits, coverRegion, insertBlock, markdownImage, placeImage, renderCover } from "./mediaOps";

function doc(): ResumeData {
  const data = structuredClone(initialResumeData);
  const project = data.projects.find((p) => p.codigo === "yolocraft")!;
  project.imageUrl = "db:projects/yolocraft/capa.png.capa.webp";
  project.galleryImages = ["db:projects/yolocraft/a.webp", "db:projects/yolocraft/b.webp"];
  project.galleryCaptions = { "db:projects/yolocraft/a.webp": "Legenda A" };
  project.detailedDescription = "Intro\n\n![Resultado](db:projects/yolocraft/a.webp)\n\nVer também db:projects/yolocraft/a.webp.bak";
  data.profile.avatarUrl = "db:geral/eu.webp";
  return data;
}

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#336699" } }).png().toBuffer();

describe("referências de imagens", () => {
  it("acha usos em campos, galerias e Markdown, sem contar chaves de legenda", () => {
    const usage = findImageUsage(doc());
    expect(usage.get("projects/yolocraft/a.webp")?.sort()).toEqual(["projects/yolocraft/detailedDescription", "projects/yolocraft/galleryImages"]);
    expect(usage.get("projects/yolocraft/a.webp.bak")).toEqual(["projects/yolocraft/detailedDescription"]);
    expect(usage.get("projects/yolocraft/capa.png.capa.webp")).toEqual(["projects/yolocraft/imageUrl"]);
    expect(usage.get("geral/eu.webp")).toEqual(["profile/avatarUrl"]);
  });

  it("troca a referência em todo lugar, inclusive chaves de legenda, sem pegar caminhos mais longos", () => {
    const data = doc();
    const count = replaceImageRef(data, "projects/yolocraft/a.webp", "projects/yolocraft/novo.webp");
    const project = data.projects.find((p) => p.codigo === "yolocraft")!;
    expect(count).toBe(3);
    expect(project.galleryImages?.[0]).toBe("db:projects/yolocraft/novo.webp");
    expect(project.galleryCaptions).toEqual({ "db:projects/yolocraft/novo.webp": "Legenda A" });
    expect(project.detailedDescription).toContain("](db:projects/yolocraft/novo.webp)");
    expect(project.detailedDescription).toContain("db:projects/yolocraft/a.webp.bak");
  });

  it("não confunde o original com o recorte de capa", () => {
    const data = doc();
    expect(replaceImageRef(data, "projects/yolocraft/capa.png", "x.png")).toBe(0);
  });
});

describe("recorte de capa", () => {
  it("cobre a imagem pelo lado mais curto, centralizado", () => {
    expect(coverRegion(3200, 1200)).toEqual({ left: 534, top: 0, width: 2133, height: 1200 });
    expect(coverRegion(1000, 1000)).toEqual({ left: 0, top: 219, width: 1000, height: 563 });
  });

  it("respeita foco e zoom sem sair da imagem", () => {
    expect(coverRegion(1600, 900, { focusX: 1, focusY: 1, zoom: 2 })).toEqual({ left: 800, top: 450, width: 800, height: 450 });
    const r = coverRegion(1601, 899, { focusX: 0, focusY: 1 });
    expect(r.left + r.width).toBeLessThanOrEqual(1601);
    expect(r.top + r.height).toBeLessThanOrEqual(899);
    expect(r.top).toBeGreaterThanOrEqual(0);
  });

  it("gera 1600×900 em WebP", async () => {
    const cover = await renderCover(await png(800, 800), {});
    const meta = await sharp(cover.body).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1600, 900, "webp"]);
    await expect(renderCover(await png(100, 100), { region: { left: 50, top: 0, width: 100, height: 56 } })).rejects.toThrow(/passa da imagem/);
  });
});

describe("edição de imagens", () => {
  it("gira, recorta, reduz e converte", async () => {
    const out = await applyEdits(await png(400, 200), ".png", {
      rotate: 90,
      crop: { left: 0, top: 0, width: 200, height: 300 },
      resize: { width: 100 },
      format: "webp",
    });
    expect([out.width, out.height, out.ext]).toEqual([100, 150, ".webp"]);
  });

  it("mantém o formato por padrão e recusa GIF/SVG", async () => {
    expect((await applyEdits(await png(10, 10), ".png", { flipHorizontal: true })).ext).toBe(".png");
    await expect(applyEdits(Buffer.from(""), ".gif", {})).rejects.toThrow(/Só PNG/);
  });
});

describe("colocação de imagens", () => {
  it("define e limpa capa e avatar", () => {
    const data = doc();
    expect(placeImage(data, { slot: "project.cover", slug: "yolocraft", ref: "db:projects/yolocraft/nova.webp" }).after).toBe(
      "db:projects/yolocraft/nova.webp",
    );
    placeImage(data, { slot: "profile.avatar", ref: null });
    expect(data.profile).not.toHaveProperty("avatarUrl");
  });

  it("galeria: insere na posição, sem duplicar, com legendas; remove junto com a legenda", () => {
    const data = doc();
    const result = placeImage(data, { slot: "project.gallery", slug: "yolocraft", ref: "db:projects/yolocraft/b.webp", position: 0, caption: "B" });
    expect(result.after).toEqual(["db:projects/yolocraft/b.webp", "db:projects/yolocraft/a.webp"]);
    placeImage(data, { slot: "project.gallery", slug: "yolocraft", ref: "db:projects/yolocraft/a.webp", remove: true });
    const project = data.projects.find((p) => p.codigo === "yolocraft")!;
    expect(project.galleryImages).toEqual(["db:projects/yolocraft/b.webp"]);
    expect(project.galleryCaptions).toEqual({ "db:projects/yolocraft/b.webp": "B" });
  });

  it("experiências por id; erros dizem o que existe", () => {
    const data = doc();
    const id = data.experiences[0].id;
    expect(placeImage(data, { slot: "experience.gallery", slug: id, ref: "db:geral/lab.webp" }).after).toContain("db:geral/lab.webp");
    expect(() => placeImage(data, { slot: "project.cover", slug: "nada", ref: null })).toThrow(/Existentes:/);
    expect(() => placeImage(data, { slot: "post.cover", slug: "x", ref: "javascript:alert(1)" })).toThrow(/inválida/);
  });
});

describe("imagem no Markdown", () => {
  it("entra depois da linha do trecho, ou ao fim", () => {
    const text = "## Resultados\nmAP 0,6.\n\n## Próximos passos";
    const block = markdownImage("db:a.webp", "Curva [PR]");
    expect(block).toBe("![Curva PR](db:a.webp)");
    expect(insertBlock(text, block, "## Resultados")).toBe("## Resultados\n\n![Curva PR](db:a.webp)\n\nmAP 0,6.\n\n## Próximos passos");
    expect(insertBlock(text, block)).toBe(`${text}\n\n${block}`);
    expect(() => insertBlock(text, block, "## Nada")).toThrow(/não encontrado/);
  });
});
