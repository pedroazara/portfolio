import { describe, expect, it } from "vitest";
import { chaveDaUrl, novaChavePrevia, previaLiberada } from "../previewLink";

/**
 * A porta que decide se um rascunho aparece para quem não está editando.
 * Errar para o lado permissivo publica sem querer; para o restritivo, quebra
 * o link que já foi mandado ao orientador.
 */
describe("previaLiberada", () => {
  const rascunho = { draft: true, chavePrevia: "abc123" };

  it("abre com a chave certa", () => {
    expect(previaLiberada(rascunho, "abc123")).toBe(true);
  });

  it("não abre com a chave errada", () => {
    expect(previaLiberada(rascunho, "outra")).toBe(false);
  });

  it("não abre sem chave", () => {
    expect(previaLiberada(rascunho, null)).toBe(false);
    expect(previaLiberada(rascunho, "")).toBe(false);
  });

  it("não abre item que nunca gerou chave, mesmo com chave na URL", () => {
    expect(previaLiberada({ draft: true }, "abc123")).toBe(false);
  });

  it("item ausente nunca abre", () => {
    expect(previaLiberada(null, "abc123")).toBe(false);
  });
});

describe("chaveDaUrl", () => {
  it("lê o parâmetro de prévia", () => {
    expect(chaveDaUrl("?previa=xyz")).toBe("xyz");
  });

  it("devolve nulo quando não há parâmetro", () => {
    expect(chaveDaUrl("")).toBeNull();
    expect(chaveDaUrl("?outra=1")).toBeNull();
  });
});

describe("novaChavePrevia", () => {
  it("gera chaves diferentes a cada chamada", () => {
    const chaves = new Set(Array.from({ length: 50 }, () => novaChavePrevia()));
    expect(chaves.size).toBe(50);
  });

  it("gera chave curta o bastante para um link", () => {
    expect(novaChavePrevia()).toHaveLength(12);
  });
});
