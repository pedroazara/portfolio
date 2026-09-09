import { expect, test } from "@playwright/test";
import { initialResumeData } from "../src/data/initialData";

test.beforeEach(async ({ page }) => {
  // Keep tests deterministic and prevent any real Supabase reads or writes.
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [{ data: initialResumeData, updated_at: "2026-01-01T00:00:00Z" }] }));
  await page.route("**/auth/v1/**", route => route.fulfill({ status: 401, json: { error: "Test has no real session" } }));
  await page.route("**/storage/v1/**", route => route.fulfill({ status: 404, body: "" }));
});

test("sandbox is isolated without the duplicate recovery panel", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", request => { if (/\/(rest|auth|storage)\/v1\//.test(request.url()) && !["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
  await page.goto("/?dev");
  await expect(page.getByRole("button", { name: "Editar Informações de Perfil", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ambiente de teste", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Histórico e recuperação", exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("portfolio_sandbox_data_v2"))).not.toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("curriculo_portfolio_data_v1"))).toBeNull();
  expect(writes).toEqual([]);
  await page.reload();
  await expect(page.getByRole("button", { name: "Editar Informações de Perfil", exact: true })).toBeVisible();
});

test("public navigation updates metadata and hides sandbox controls", async ({ page }) => {
  await page.goto("/?dev=0");
  await expect(page.getByRole("button", { name: "Ambiente de teste", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Blog/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/blog$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test("server protects API and supplies security headers", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.headers()["x-content-type-options"]).toBe("nosniff");
  expect(health.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(health.headers()["x-powered-by"]).toBeUndefined();
  expect((await request.post("/api/translate", { data: { text: "Olá" } })).status()).toBe(401);
  expect((await request.get("/api/translate")).status()).toBe(405);
});
