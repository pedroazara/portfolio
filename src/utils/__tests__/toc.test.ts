import { describe, expect, it } from "vitest";
import { extractToc, headingId } from "../toc";

/**
 * O id gerado aqui precisa ser o mesmo que o renderizador põe no título — é o
 * que faz o link do sumário parar na seção certa.
 */

describe("headingId", () => {
  it("tira acentos e troca separadores por hífen", () => {
    expect(headingId("Relevância científica")).toBe("relevancia-cientifica");
  });

  it("não deixa hífen sobrando nas pontas", () => {
    expect(headingId("  Homing e limites!  ")).toBe("homing-e-limites");
  });

  it("limita o comprimento", () => {
    expect(headingId("a".repeat(80)).length).toBe(60);
  });
});

describe("extractToc", () => {
  it("lista títulos de nível 2 e 3 com a linha de origem", () => {
    const toc = extractToc("# Título\n\n## Primeira\n\ntexto\n\n### Detalhe\n");
    expect(toc.map((e) => [e.text, e.level, e.line])).toEqual([
      ["Primeira", 2, 3],
      ["Detalhe", 3, 7],
    ]);
  });

  it("ignora cerquilha dentro de bloco de código", () => {
    const toc = extractToc("## Real\n\n```python\n# comentário\n## também não\n```\n");
    expect(toc).toHaveLength(1);
    expect(toc[0].text).toBe("Real");
  });

  it("desempata títulos repetidos", () => {
    const toc = extractToc("## Medição\n\n## Medição\n");
    expect(toc[0].id).not.toBe(toc[1].id);
  });

  it("devolve lista vazia para texto vazio", () => {
    expect(extractToc("")).toEqual([]);
  });
});
