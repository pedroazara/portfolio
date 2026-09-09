import { test, expect } from "@playwright/test";

test("production caches public pages and offers an offline fallback", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20000 });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.reload();
  await expect.poll(() => page.evaluate(async () => !!await (await caches.open("portfolio-pages")).match(location.origin + "/"))).toBe(true);
  await page.goto("/projetos?q=teste&sort=title");
  await expect(page.getByRole("textbox", { name: "Buscar projetos", exact: true })).toHaveValue("teste");
  await expect.poll(() => page.evaluate(async () => !!await (await caches.open("portfolio-pages")).match(location.href))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Buscar projetos", exact: true })).toHaveValue("teste");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByText("Sem conexão. Você está vendo a cópia disponível neste dispositivo.")).toBeVisible();
  await page.goto("/pagina-nunca-visitada");
  await expect(page.getByRole("heading", { name: "Você está sem conexão" })).toBeVisible();
  await context.setOffline(false);
});

test("production never enables sandbox and excludes admin pages from runtime cache", async ({ page }) => {
  await page.goto("/?dev");
  await expect(page.getByRole("button", { name: "Editar Informações de Perfil", exact: true })).toHaveCount(0);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.goto("/admin/posts/novo");
  const keys = await page.evaluate(async () => (await (await caches.open("portfolio-pages")).keys()).map(request => request.url));
  expect(keys.some(url => url.includes("/admin") || url.includes("?dev"))).toBe(false);
});
