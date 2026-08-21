import { describe, expect, it } from "vitest";
import { formatarData, formatarPeriodo } from "../periodo";

describe("formatarData", () => {
  it("mostra mês e ano no idioma pedido", () => {
    expect(formatarData("2024-03")).toBe("mar 2024");
    expect(formatarData("2024-03", "en")).toBe("Mar 2024");
  });

  it("deixa o ano sozinho como está", () => {
    expect(formatarData("2024")).toBe("2024");
  });

  it("devolve vazio para data ausente", () => {
    expect(formatarData(undefined)).toBe("");
    expect(formatarData("")).toBe("");
  });

  it("não inventa mês para valor fora da faixa", () => {
    expect(formatarData("2024-13")).toBe("2024-13");
    expect(formatarData("2024-00")).toBe("2024-00");
  });
});

describe("formatarPeriodo", () => {
  it("liga as duas pontas", () => {
    expect(formatarPeriodo("2022-03", "2024-12")).toBe("mar 2022 — dez 2024");
  });

  it("em curso vira Presente", () => {
    expect(formatarPeriodo("2022-03", "", true)).toBe("mar 2022 — Presente");
    expect(formatarPeriodo("2022-03", "", true, "en")).toBe("Mar 2022 — Present");
  });

  it("com uma ponta só, mostra a ponta", () => {
    expect(formatarPeriodo("2022-03")).toBe("mar 2022");
    expect(formatarPeriodo(undefined, "2024-12")).toBe("dez 2024");
  });

  it("sem nenhuma data, não mostra travessão solto", () => {
    expect(formatarPeriodo()).toBe("");
  });
});
