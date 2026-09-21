import { expect, test } from "@playwright/test";
import { initialResumeData } from "../src/data/initialData";

const cover = "/pitch/sirius-aerial.png";
const gallery = "/pitch/research/ic-dinamica-kmeans.png";
const data = {
  ...initialResumeData,
  projects: [
    { id: "pitch-a", title: "Projeto A", description: "Descrição A", categoryId: "pitch", tags: [], featured: true, imageUrl: cover, galleryImages: [cover, gallery] },
    { id: "pitch-b", title: "Projeto B", description: "Descrição B", categoryId: "pitch", tags: [], featured: true, imageUrl: cover },
    { id: "pitch-draft", title: "Rascunho", description: "Privado", categoryId: "pitch", tags: [], draft: true },
  ],
  categories: [{ id: "pitch", name: "Projetos" }],
};

test.use({ viewport: { width: 1366, height: 768 }, serviceWorkers: "block" });

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/**", route => route.fulfill({ json: { data, updated_at: "2026-09-01T00:00:00Z" } }));
  await page.route("**/auth/v1/**", route => route.fulfill({ status: 401, json: {} }));
  await page.route("**/storage/v1/**", route => route.fulfill({ status: 404, body: "" }));
  await page.route("**/api/**", route => route.fulfill({ json: {} }));
  await page.addInitScript(value => {
    localStorage.setItem("curriculo_portfolio_data_v1", JSON.stringify(value));
  }, data);
});

test("signed-in admin can edit pitch selection and keep it after reload", async ({ page }) => {
  // Mock login exercises the production path without ?dev or real credentials.
  await page.route("**/auth/v1/token?**", route => route.fulfill({
    json: {
      access_token: "test-access-token", refresh_token: "test-refresh-token",
      token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: "pitch-test-admin", aud: "authenticated", role: "authenticated", email: "pitch@example.test" },
    },
  }));
  await page.goto("/admin");
  await page.getByLabel("E-mail", { exact: true }).fill("pitch@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Acessar Painel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/elevator-pitch");
  const edit = page.getByRole("button", { name: "Editar pitch", exact: true });
  await expect(edit).toBeVisible();
  await edit.press("Space");
  const project = page.getByRole("button", { name: "Projeto A", exact: true });
  await expect(project).toHaveAttribute("aria-pressed", "true");
  await project.click();
  await expect(project).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Rascunho", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Apresentar", exact: true }).click();
  await expect(page.locator('[data-pitch-slide="1"]')).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-pitch-slide="2"]')).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-pitch-slide="3"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Projeto A", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Projeto B", exact: true })).toBeVisible();
  await page.reload();
  await edit.click();
  await expect(project).toHaveAttribute("aria-pressed", "false");
  await project.click();
  await expect(project).toHaveAttribute("aria-pressed", "true");
});

test("project hover and carousel preserve every thumbnail and keyboard focus", async ({ page }) => {
  await page.goto("/elevator-pitch");
  await expect(page.locator('[data-pitch-slide="1"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar pitch" })).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-pitch-slide="2"]')).toBeVisible();
  await page.keyboard.press("ArrowRight");
  const slide = page.locator('[data-pitch-slide="3"]');
  await expect(slide).toBeVisible();
  const first = slide.getByRole("button", { name: "Projeto A", exact: true });
  const second = slide.getByRole("button", { name: "Projeto B", exact: true });
  const firstImage = await first.locator("img").elementHandle();
  const secondImage = await second.locator("img").elementHandle();
  await page.getByRole("button", { name: "Próxima imagem", exact: true }).click();
  await expect(slide.locator(`img[src="${gallery}"]`)).toHaveCount(1);
  await second.hover();
  await expect(slide.getByRole("heading", { name: "Projeto B", exact: true })).toBeVisible();
  await expect(slide.locator(`img[src="${cover}"]`)).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Próxima imagem", exact: true })).toHaveCount(0);
  await first.focus();
  await expect(first).toBeFocused();
  await second.focus();
  await expect(second).toBeFocused();
  expect(await firstImage!.evaluate(el => el.isConnected)).toBe(true);
  expect(await secondImage!.evaluate(el => el.isConnected)).toBe(true);
});
