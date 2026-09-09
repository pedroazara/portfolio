import { expect, test } from "@playwright/test";
import { initialResumeData } from "../src/data/initialData";
const fixture = structuredClone(initialResumeData);
fixture.projects.push({ id: "ux-gallery", codigo: "ux-gallery", title: "UX Gallery", description: "Test fixture", categoryId: "ux-category", tags: [], galleryImages: ["/favicon.svg", "/og-home.svg"], detailedDescription: "## Visão geral\n\nTeste\n\n## Detalhes\n\nTeste" });
fixture.categories.push({ id: "ux-category", name: "UX Tests" });
fixture.posts.push({ id: "ux-article", codigo: "ux-article", title: "UX Article", summary: "Test fixture", content: "## Introdução\n\n" + "Texto para teste de leitura. ".repeat(400) + "\n\n## Resultados\n\nTeste.", date: "2026-01-01", tags: [] });

test.beforeEach(async ({ page }) => {
  // Keep tests deterministic and prevent any real Supabase reads or writes.
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [{ data: fixture, updated_at: "2026-01-01T00:00:00Z" }] }));
  await page.route("**/auth/v1/**", route => route.fulfill({ status: 401, json: { error: "Test has no real session" } }));
  await page.route("**/storage/v1/**", route => route.fulfill({ status: 404, body: "" }));
});

test("filters survive reload and returning from a project", async ({ page }) => {
  await page.goto("/projetos?category=ux-category&sort=title&q=UX");
  await expect(page.getByRole("textbox", { name: "Buscar projetos", exact: true })).toHaveValue("UX");
  await expect(page.getByRole("combobox", { name: "Ordenar projetos" })).toHaveValue("title");
  await page.getByRole("link", { name: "UX Gallery", exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/projetos\/ux-gallery$/);
  await page.getByRole("link", { name: "Todos os projetos", exact: true }).click();
  await expect(page).toHaveURL(/category=ux-category/);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Buscar projetos", exact: true })).toHaveValue("UX");
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page).toHaveURL(/\/projetos$/);
});

test("gallery supports zoom, keyboard and restores focus", async ({ page }) => {
  await page.goto("/projetos/ux-gallery");
  const trigger = page.getByRole("button", { name: "Abrir imagem 1", exact: true });
  await trigger.click();
  const gallery = page.getByRole("dialog", { name: "Galeria de imagens" });
  await expect(gallery).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(gallery.getByRole("img")).toHaveAttribute("alt", "UX Gallery — 2");
  await gallery.getByRole("button", { name: "Ampliar", exact: true }).click();
  await expect(gallery.getByRole("button", { name: "Ajustar imagem" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(gallery).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("mobile menu contains keyboard focus and article anchors survive loading", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/blog/ux-article#resultados");
  const heading = page.getByRole("heading", { name: "Resultados", exact: true });
  await expect(heading).toBeInViewport();
  await expect(page).toHaveURL(/#resultados$/);
  await page.getByRole("button", { name: "Nesta página" }).click();
  await page.getByRole("button", { name: "Copiar link da seção: Resultados" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/blog\/ux-article#resultados$/);
  await page.getByRole("button", { name: "Abrir menu de navegação" }).click();
  const menu = page.getByRole("dialog", { name: "Menu de navegação" });
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir menu de navegação" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("unsaved article draft can be recovered after reload", async ({ page }) => {
  page.on("dialog", dialog => dialog.accept());
  await page.goto("/admin/posts/novo?dev");
  await page.getByPlaceholder("Título do artigo", { exact: true }).fill("Edição local recuperável");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("sandbox:editor:post:novo"))).toContain("Edição local recuperável");
  await page.reload();
  await page.getByRole("button", { name: "Recuperar edição", exact: true }).click();
  await expect(page.getByPlaceholder("Título do artigo", { exact: true })).toHaveValue("Edição local recuperável");
});

test("project controls fit a narrow screen in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/projetos?q=UX&category=ux-category");
  await expect(page.getByRole("link", { name: "UX Gallery", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Abrir menu de navegação" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Escuro", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/projects-mobile-dark.png", fullPage: true });
});

test("failed images show a neutral placeholder instead of unrelated content", async ({ page }) => {
  await page.route("**/favicon.svg", route => route.fulfill({ status: 404, body: "" }));
  await page.goto("/projetos/ux-gallery");
  await page.getByRole("button", { name: "Abrir imagem 1", exact: true }).click();
  await expect(page.getByRole("dialog").locator('span[role="img"]')).toBeVisible();
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
