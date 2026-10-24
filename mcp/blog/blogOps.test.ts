import { describe, expect, it } from "vitest";
import type { BlogPost, Project } from "../../src/types";
import { applyPostChanges, buildNewPost, findPost, matchesPostQuery, readTimeOf, sortPosts } from "./blogOps";

const projects: Project[] = [
  { id: "proj-yolocraft", codigo: "yolocraft", codigosAntigos: ["yolo"], title: "YOLOcraft", description: "", categoryId: "software", tags: [] },
];

const pyvisa: BlogPost = {
  id: "post-pyvisa",
  codigo: "pyvisa",
  title: "Automatizando a bancada com PyVISA",
  summary: "Como controlar instrumentos.",
  content: "## Introdução\n\nTexto.\n\n## Conclusão\n\nFim.",
  date: "2026-03-10",
  tags: ["Python"],
  category: "Instrumentação",
  categoryEn: "Instrumentation",
};
const dft: BlogPost = { id: "post-dft", title: "DFT na prática", summary: "", content: "", date: "2026-05-02", tags: [], draft: true };

describe("findPost", () => {
  it("acha por código ou id", () => {
    expect(findPost([pyvisa, dft], "pyvisa").id).toBe("post-pyvisa");
    expect(findPost([pyvisa, dft], "post-dft").id).toBe("post-dft");
  });
  it("o erro lista os códigos existentes", () => {
    expect(() => findPost([pyvisa, dft], "nada")).toThrow(/pyvisa, post-dft/);
  });
});

describe("applyPostChanges", () => {
  it("altera só o que veio e remove com null", () => {
    const { post, changedFields } = applyPostChanges(pyvisa, { titleEn: "Bench automation", categoryEn: null }, [dft], projects);
    expect(post.titleEn).toBe("Bench automation");
    expect(post).not.toHaveProperty("categoryEn");
    expect(changedFields.sort()).toEqual(["categoryEn", "titleEn"]);
  });

  it("traduz sozinha uma categoria conhecida", () => {
    const { post } = applyPostChanges(pyvisa, { category: "Física Computacional" }, [], projects);
    expect(post.categoryEn).toBe("Computational Physics");
  });

  it("não deixa a categoria antiga em inglês ao usar uma categoria nova", () => {
    const { post } = applyPostChanges(pyvisa, { category: "Eletrônica" }, [], projects);
    expect(post.category).toBe("Eletrônica");
    expect(post).not.toHaveProperty("categoryEn");
  });

  it("guarda o código atual dos projetos relacionados e recusa os inexistentes", () => {
    expect(applyPostChanges(pyvisa, { projetos: ["yolo"] }, [], projects).post.projetos).toEqual(["yolocraft"]);
    expect(() => applyPostChanges(pyvisa, { projetos: ["fantasma"] }, [], projects)).toThrow(/fantasma/);
  });

  it("renomear guarda o código antigo e recusa código em uso", () => {
    const renamed = applyPostChanges(pyvisa, { codigo: "Bancada com PyVISA" }, [dft], projects).post;
    expect(renamed.codigo).toBe("bancada-com-pyvisa");
    expect(renamed.codigosAntigos).toEqual(["pyvisa"]);
    expect(() => applyPostChanges(pyvisa, { codigo: "post-dft" }, [dft], projects)).toThrow(/já usa/);
  });

  it("valida capa e data", () => {
    expect(() => applyPostChanges(pyvisa, { imageUrl: "http://x.com/a.png" }, [], projects)).toThrow(/Imagem inválida/);
    expect(() => applyPostChanges(pyvisa, { date: "10/03/2026" }, [], projects)).toThrow();
  });

  it("completa o protocolo das referências", () => {
    const { post } = applyPostChanges(pyvisa, { references: [{ title: "Docs", url: "pyvisa.readthedocs.io" }] }, [], projects);
    expect(post.references).toEqual([{ title: "Docs", url: "https://pyvisa.readthedocs.io" }]);
  });
});

describe("buildNewPost", () => {
  it("nasce rascunho, com a data de hoje e o código tirado do título", () => {
    const post = buildNewPost({ title: "Óptica não linear" }, [pyvisa], projects, new Date("2026-10-24T12:00:00Z"));
    expect(post).toMatchObject({ codigo: "optica-nao-linear", draft: true, date: "2026-10-24", category: "Instrumentação" });
  });
  it("publica só quando pedido", () => {
    expect(buildNewPost({ title: "Outro", draft: false }, [], projects).draft).toBe(false);
  });
});

describe("listagem", () => {
  it("ordena do mais recente ao mais antigo", () => {
    expect(sortPosts([pyvisa, dft]).map((p) => p.id)).toEqual(["post-dft", "post-pyvisa"]);
  });
  it("filtra por tag e categoria", () => {
    expect(matchesPostQuery(pyvisa, "python")).toBe(true);
    expect(matchesPostQuery(pyvisa, "instrumenta")).toBe(true);
    expect(matchesPostQuery(dft, "python")).toBe(false);
  });
  it("calcula o tempo de leitura quando não foi informado", () => {
    expect(readTimeOf(pyvisa).pt).toBe("1 min de leitura");
    expect(readTimeOf({ ...pyvisa, readTime: "8 min" }).en).toBe("8 min");
  });
});
