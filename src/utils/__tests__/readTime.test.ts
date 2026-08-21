import { describe, expect, it } from "vitest";
import { estimateReadTime } from "../readTime";

describe("estimateReadTime", () => {
  it("nunca anuncia menos de um minuto", () => {
    expect(estimateReadTime("três palavras aqui")).toBe("1 min de leitura");
  });

  it("responde no idioma pedido", () => {
    expect(estimateReadTime("texto", "en")).toBe("1 min read");
  });

  it("texto vazio ainda devolve uma estimativa", () => {
    expect(estimateReadTime("")).toBe("1 min de leitura");
    expect(estimateReadTime("   ")).toBe("1 min de leitura");
  });

  it("desconta blocos de código", () => {
    const prosa = "palavra ".repeat(400);
    const comCodigo = `${prosa}\n\n\`\`\`python\n${"linha_de_codigo = 1\n".repeat(400)}\`\`\``;
    expect(estimateReadTime(comCodigo)).toBe(estimateReadTime(prosa));
  });

  it("conta o texto do link, não o endereço", () => {
    const comLink = "veja [a documentação](https://exemplo.com/um/caminho/bem/longo/ainda)";
    expect(estimateReadTime(comLink)).toBe("1 min de leitura");
  });
});
