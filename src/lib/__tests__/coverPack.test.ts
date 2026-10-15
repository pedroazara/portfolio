import { describe, expect, it } from "vitest";
import { cardFrameClass, isSvgRef, pickCoverArt, socialImageOf } from "../coverPack";

const card = { light: "db:p/card-light.svg", dark: "db:p/card-dark.svg" };

describe("pacote de capas", () => {
  it("topo da página e miniatura caem no cartão quando faltam", () => {
    expect(pickCoverArt({ card }, "hero")).toBe(card);
    expect(pickCoverArt({ card }, "square")).toBe(card);
    expect(pickCoverArt({ card }, "cardMobile")).toBeUndefined();
    expect(pickCoverArt(undefined, "card")).toBeUndefined();
  });

  it("o quadro do cartão só vira 4:3 no celular quando há arte 4:3", () => {
    expect(cardFrameClass({ coverPack: { card, cardMobile: card } })).toBe("aspect-[4/3] sm:aspect-video");
    expect(cardFrameClass({ coverPack: { card } })).toBe("aspect-video");
    expect(cardFrameClass({})).toBe("aspect-video");
  });

  it("a prévia do link nunca é SVG", () => {
    expect(socialImageOf({ coverPack: { card, og: "db:p/og.jpg" }, imageUrl: "db:p/card-light.svg" })).toBe("db:p/og.jpg");
    expect(socialImageOf({ imageUrl: "db:p/card-light.svg" })).toBeUndefined();
    expect(socialImageOf({ imageUrl: "db:p/capa.webp" })).toBe("db:p/capa.webp");
    expect(isSvgRef("https://x.supabase.co/a.svg?v=2")).toBe(true);
  });
});
