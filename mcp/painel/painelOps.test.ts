import { describe, expect, it } from "vitest";
import { normalizeKind, resolveDay } from "./painelOps";

describe("resolveDay", () => {
  it("usa hoje em São Paulo quando não há dia", () => {
    // 01:30 UTC ainda é o dia anterior em São Paulo (UTC−3).
    expect(resolveDay(undefined, new Date("2026-10-11T01:30:00Z"))).toBe("2026-10-10");
  });
  it("aceita AAAA-MM-DD válido", () => {
    expect(resolveDay("2026-02-28")).toBe("2026-02-28");
  });
  it("recusa datas impossíveis ou fora do formato", () => {
    expect(() => resolveDay("2026-02-30")).toThrow();
    expect(() => resolveDay("10/10/2026")).toThrow();
  });
});

describe("normalizeKind", () => {
  it("tira acentos e maiúsculas", () => {
    expect(normalizeKind("Inglês")).toBe("ingles");
    expect(normalizeKind("Notícias do dia")).toBe("noticias-do-dia");
  });
  it("recusa séries vazias", () => {
    expect(() => normalizeKind("!")).toThrow();
  });
});
