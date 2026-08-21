import { describe, expect, it } from "vitest";
import { offsetOfLine } from "../editTarget";

/** É o que decide onde o cursor cai quando "Editar" abre o editor. */
describe("offsetOfLine", () => {
  const texto = "primeira\nsegunda\nterceira";

  it("a linha 1 começa no início", () => {
    expect(offsetOfLine(texto, 1)).toBe(0);
  });

  it("acha o começo de uma linha do meio", () => {
    expect(texto.slice(offsetOfLine(texto, 2), offsetOfLine(texto, 2) + 7)).toBe("segunda");
  });

  it("linha além do fim para no fim do texto", () => {
    expect(offsetOfLine(texto, 99)).toBe(texto.length);
  });

  it("linha zero ou negativa começa no início", () => {
    expect(offsetOfLine(texto, 0)).toBe(0);
    expect(offsetOfLine(texto, -3)).toBe(0);
  });

  it("linha em branco no meio não desalinha as seguintes", () => {
    const comVazia = "a\n\nc";
    expect(comVazia.slice(offsetOfLine(comVazia, 3))).toBe("c");
  });
});
