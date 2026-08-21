import { describe, expect, it } from "vitest";
import { parseYouTubeUrl } from "../videoEmbed";

/** O autor cola a URL como ela vem da barra de endereços; todos os formatos valem. */
describe("parseYouTubeUrl", () => {
  const ID = "dQw4w9WgXcQ";

  it("reconhece o formato watch", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}`)?.id).toBe(ID);
  });

  it("reconhece o encurtado", () => {
    expect(parseYouTubeUrl(`https://youtu.be/${ID}`)?.id).toBe(ID);
  });

  it("reconhece o embed", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/embed/${ID}`)?.id).toBe(ID);
  });

  it("marca o Shorts como vídeo em pé", () => {
    expect(parseYouTubeUrl(`https://youtube.com/shorts/${ID}`)?.portrait).toBe(true);
  });

  it("guarda o segundo inicial em segundos", () => {
    expect(parseYouTubeUrl(`https://youtu.be/${ID}?t=90`)?.start).toBe(90);
    expect(parseYouTubeUrl(`https://youtu.be/${ID}?t=1m30s`)?.start).toBe(90);
  });

  it("ignora endereços de outros sites", () => {
    expect(parseYouTubeUrl("https://vimeo.com/12345")).toBeNull();
    expect(parseYouTubeUrl("não é uma url")).toBeNull();
  });
});
