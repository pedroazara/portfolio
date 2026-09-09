import { expect, it } from "vitest";
import { localRateLimit, translationInput } from "./translate";
it("bounds translation payloads", () => {
  expect(translationInput.safeParse({ text: "Olá" }).success).toBe(true);
  for (const value of [{ text: " " }, { text: "x".repeat(40001) }, { texts: {} }, { text: "ok", injected: true }]) expect(translationInput.safeParse(value).success).toBe(false);
});
it("expires the local rate limiter window", () => {
  expect(localRateLimit("unit-test", 1, 0)).toBe(true); expect(localRateLimit("unit-test", 1, 1)).toBe(false); expect(localRateLimit("unit-test", 1, 60000)).toBe(true);
});
