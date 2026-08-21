import { describe, expect, it } from "vitest";
import { findBySlug, isOldSlug, slugOf } from "../slug";

/**
 * Estas funções decidem qual página abre para cada URL. Quando erram, o
 * sintoma é um link morto — que ninguém percebe do lado de dentro do site,
 * porque a navegação interna sempre usa o endereço atual.
 */

const projetos = [
  { id: "proj-1", codigo: "seriemapump", codigosAntigos: ["portfolio-site"] },
  { id: "proj-2", codigo: "yolocraft" },
  { id: "proj-3" },
];

describe("slugOf", () => {
  it("prefere o código legível ao id interno", () => {
    expect(slugOf(projetos[0])).toBe("seriemapump");
  });

  it("cai no id quando não há código", () => {
    expect(slugOf(projetos[2])).toBe("proj-3");
  });
});

describe("findBySlug", () => {
  it("acha pelo código atual", () => {
    expect(findBySlug(projetos, "yolocraft")?.id).toBe("proj-2");
  });

  it("acha pelo id, para links antigos baseados nele", () => {
    expect(findBySlug(projetos, "proj-3")?.id).toBe("proj-3");
  });

  it("acha por um código abandonado", () => {
    expect(findBySlug(projetos, "portfolio-site")?.id).toBe("proj-1");
  });

  it("devolve nulo quando o trecho não é de ninguém", () => {
    expect(findBySlug(projetos, "nao-existe")).toBeNull();
  });

  it("devolve nulo para trecho vazio", () => {
    expect(findBySlug(projetos, "")).toBeNull();
    expect(findBySlug(projetos, undefined)).toBeNull();
  });

  it("o código atual de um vence o código abandonado de outro", () => {
    const disputa = [
      { id: "antigo-dono", codigo: "novo-nome", codigosAntigos: ["disputado"] },
      { id: "novo-dono", codigo: "disputado" },
    ];
    expect(findBySlug(disputa, "disputado")?.id).toBe("novo-dono");
  });
});

describe("isOldSlug", () => {
  it("reconhece o endereço abandonado", () => {
    expect(isOldSlug(projetos[0], "portfolio-site")).toBe(true);
  });

  it("não trata o endereço atual como antigo", () => {
    expect(isOldSlug(projetos[0], "seriemapump")).toBe(false);
  });

  it("não trata um desconhecido como antigo", () => {
    expect(isOldSlug(projetos[0], "outro")).toBe(false);
  });
});
