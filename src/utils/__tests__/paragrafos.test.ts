import { describe, expect, it } from "vitest";
import { paragrafos } from "../paragrafos";

describe("paragrafos", () => {
  it("separa nas linhas vazias, uma ou mais", () => {
    expect(paragrafos("Primeiro.\n\n\nSegundo.\n\nTerceiro.")).toEqual(["Primeiro.", "Segundo.", "Terceiro."]);
  });

  it("trata linhas só com espaços como vazias", () => {
    expect(paragrafos("Um.\n  \t\nDois.")).toEqual(["Um.", "Dois."]);
  });

  it("mantém a quebra simples dentro do parágrafo", () => {
    expect(paragrafos("Linha um\nlinha dois")).toEqual(["Linha um\nlinha dois"]);
  });

  it("descarta sobras em branco nas pontas", () => {
    expect(paragrafos("\n\nÚnico.\n\n")).toEqual(["Único."]);
    expect(paragrafos("   ")).toEqual([]);
  });
});
