import { describe, expect, it } from "vitest";
import { pareceFluxograma, parseFluxograma } from "../fluxograma";

/** O bloco exatamente como está no post do projeto de oratória. */
const DO_POST = `Tema aleatório e desconhecido
        ↓
Pesquisa livre (tempo limitado)   |   O sistema monta, em segredo,
                                  |   a referência e a rubrica
        ↓
Gravação da explicação em voz alta
        ↓
Transcrição (Whisper: local no PC, Groq no site)
        ↓
Métricas de fala (código) + análise do conteúdo (LLM)
        ↓
Relatório com feedback`;

describe("parseFluxograma", () => {
  it("lê o bloco do post com nota em duas linhas", () => {
    const { passos, rotulos } = parseFluxograma(DO_POST);
    expect(passos).toHaveLength(6);
    expect(rotulos).toHaveLength(5);
    expect(passos[1]).toEqual({
      titulo: "Pesquisa livre",
      detalhe: "tempo limitado",
      nota: "O sistema monta, em segredo, a referência e a rubrica",
    });
    expect(passos[3]).toEqual({ titulo: "Transcrição", detalhe: "Whisper: local no PC, Groq no site" });
  });

  it("não quebra passo com mais de um parêntese", () => {
    const { passos } = parseFluxograma(DO_POST);
    expect(passos[4]).toEqual({ titulo: "Métricas de fala (código) + análise do conteúdo (LLM)" });
  });

  it("guarda o rótulo escrito depois da seta", () => {
    const { rotulos } = parseFluxograma("A\n↓ se aprovado\nB\n-> (senão)\nC");
    expect(rotulos).toEqual(["se aprovado", "senão"]);
  });

  it("junta linhas seguidas no mesmo passo quando há setas", () => {
    const { passos } = parseFluxograma("Coleta\ndos dados brutos\n↓\nModelo");
    expect(passos[0]).toEqual({ titulo: "Coleta", detalhe: "dos dados brutos" });
  });

  it("sem setas, cada linha é um passo", () => {
    expect(parseFluxograma("A\nB\nC").passos.map((p) => p.titulo)).toEqual(["A", "B", "C"]);
  });
});

describe("pareceFluxograma", () => {
  it("reconhece o bloco do post", () => {
    expect(pareceFluxograma(DO_POST)).toBe(true);
  });

  it("ignora código comum", () => {
    expect(pareceFluxograma("const a = 1;\nconsole.log(a);")).toBe(false);
  });

  it("exige ao menos duas setas e nenhuma nas pontas", () => {
    expect(pareceFluxograma("A\n↓\nB")).toBe(false);
    expect(pareceFluxograma("↓\nA\n↓\nB")).toBe(false);
    expect(pareceFluxograma("A\n↓\n↓\nB")).toBe(false);
  });
});
