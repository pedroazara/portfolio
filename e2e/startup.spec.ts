import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

for (const dark of [false, true]) {
  test(`reload shows the skeleton before React loads (${dark ? "dark" : "light"})`, async ({ page }) => {
    await page.addInitScript(value => {
      localStorage.setItem("portfolio_dark_mode_v1", String(value));
    }, dark);
    let release!: () => void;
    const bundleGate = new Promise<void>(resolve => { release = resolve; });
    await page.route(/\/assets\/.*\.js(?:\?.*)?$/, async route => {
      await bundleGate;
      await route.continue();
    });
    try {
      await page.goto("/", { waitUntil: "commit" });
      await expect(page.locator("#boot-skeleton")).toBeVisible();
      await expect(page.locator("#prerender-content")).toBeHidden();
      await expect(page.locator("body")).toHaveCSS("background-color", dark ? "rgb(2, 6, 23)" : "rgb(248, 250, 252)");
      await page.reload({ waitUntil: "commit" });
      await expect(page.locator("#boot-skeleton")).toBeVisible();
      await expect(page.locator("#prerender-content")).toBeHidden();
    } finally {
      release();
    }
    await expect(page.locator("#boot-skeleton")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20000 });
  });
}

test("static content stays readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: "block" });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3200/");
    await expect(page.locator("#boot-skeleton")).toBeHidden();
    await expect(page.locator("#prerender-content h1")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("failed JavaScript restores the static content", async ({ page }) => {
  await page.clock.install();
  await page.route(/\/assets\/.*\.js(?:\?.*)?$/, route => route.abort());
  await page.goto("/");
  await expect(page.locator("#boot-skeleton")).toBeVisible();
  await page.clock.fastForward(15000);
  await expect(page.locator("#boot-skeleton")).toBeHidden();
  await expect(page.locator("#prerender-content h1")).toBeVisible();
});
