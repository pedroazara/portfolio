import { expect, test } from "@playwright/test";
import { initialResumeData } from "../src/data/initialData";

test.beforeEach(async ({ page }) => {
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [{ data: initialResumeData }] }));
  await page.route("**/auth/v1/**", route => route.fulfill({ status: 401, json: {} }));
  await page.route("**/storage/v1/**", route => route.fulfill({ status: 404, body: "" }));
});

test("language highlight stays inside its control when switching after scrolling", async ({ page }) => {
  await page.goto("/curriculo");
  for (const language of ["en", "pt"] as const) {
    await page.mouse.wheel(0, 800);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
    await page.mouse.wheel(0, -80);
    await expect(page.getByRole("banner")).toHaveCSS("opacity", "1");
    await page.evaluate(() => {
      (window as any).__languageOffsets = [];
      const record = () => {
        const line = document.querySelector('[data-testid="language-desktop"] [data-testid="language-indicator"]')!;
        const rect = line.getBoundingClientRect();
        const parent = line.parentElement!.getBoundingClientRect();
        (window as any).__languageOffsets.push(Math.max(Math.abs(rect.top - parent.top), parent.left - rect.left, rect.right - parent.right));
        if ((window as any).__languageOffsets.length < 40) requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });
    const button = page.getByRole("button", { name: language === "en" ? "Change language to English" : "Mudar idioma para Português" });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => (window as any).__languageOffsets.length)).toBe(40);
    expect(await page.evaluate(() => Math.max(...(window as any).__languageOffsets))).toBeLessThan(1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menu de navegação" }).click();
  await page.getByRole("button", { name: "English (EN)", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/resume$/);
  await page.getByRole("button", { name: "Abrir menu de navegação" }).click();
  await expect(page.getByRole("button", { name: "English (EN)", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("opening the blog from a scrolled page starts at the top without a scroll animation", async ({ page }) => {
  await page.goto("/curriculo");
  await expect(page.getByRole("banner")).toBeVisible();
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
  await page.mouse.wheel(0, -80);
  await expect(page.getByRole("banner")).toHaveCSS("opacity", "1");
  await page.evaluate(() => {
    const samples: number[] = [];
    (window as any).__blogScrollSamples = samples;
    (window as any).__indicatorOffsets = [];
    const record = () => {
      // The URL changes before React commits; only sample the actual blog page.
      if (location.pathname === "/blog" && document.getElementById("blog-section")) samples.push(scrollY);
      if (location.pathname === "/blog") {
        const nav = document.querySelector('nav[aria-label="Navegação principal"]')!;
        const line = nav.querySelector('[data-testid="nav-indicator"]');
        if (line) (window as any).__indicatorOffsets.push(Math.abs(line.getBoundingClientRect().bottom - nav.getBoundingClientRect().bottom));
      }
      if (samples.length < 20) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  await page.getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect.poll(() => page.evaluate(() => (window as any).__blogScrollSamples.length)).toBe(20);
  expect(await page.evaluate(() => (window as any).__blogScrollSamples)).toEqual(Array(20).fill(0));
  expect(await page.evaluate(() => Math.max(...(window as any).__indicatorOffsets))).toBeLessThan(5);
  await expect(page.getByRole("banner")).toHaveCSS("opacity", "1");
});

test("orbit hover grows the nucleus and reduced motion stops the electron", async ({ page }) => {
  await page.goto("/");
  const icon = page.locator(".orb-hover").first();
  const nucleus = icon.locator(".orb-nucleo");
  await expect(nucleus).toBeVisible();
  await icon.hover();
  await expect.poll(() => nucleus.evaluate(el => getComputedStyle(el).transform)).not.toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("animateMotion")).toHaveCount(0);
  await expect(icon.locator(".orb-e")).toHaveAttribute("transform", "translate(11 24)");
  await expect.poll(() => nucleus.evaluate(el => getComputedStyle(el).transform)).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(icon.locator("animateMotion")).toHaveCount(1);
});

test("login stays mounted during exit and can open again", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Acessar Área de Administração" });
  await trigger.click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await expect.poll(() => modal.locator("form").evaluate(el => getComputedStyle(el.parentElement!).opacity)).toBe("1");
  await page.keyboard.press("Escape");
  await expect(modal).toBeAttached();
  await expect(modal).not.toBeAttached();
  await trigger.click();
  await expect(modal).toBeVisible();
});

test("skill bubbles stay open after mouse click and toggle with keyboard", async ({ page }) => {
  await page.goto("/?dev");
  await page.getByRole("button", { name: "Elevator Pitch", exact: true }).click();
  await expect(page.locator(".animate-gradient-flow")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".animate-gradient-flow").getByText("02", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  const node = page.getByRole("button", { name: "Software", exact: true });
  await expect(node).toBeVisible();
  await node.hover();
  await expect(node).toHaveAttribute("aria-expanded", "true");
  await node.click();
  await expect(node).toHaveAttribute("aria-expanded", "true");
  await expect(node.getByText("Python", { exact: true })).toBeVisible();
  await node.press("Enter");
  await expect(node).toHaveAttribute("aria-expanded", "false");
  await node.press("Enter");
  await expect(node).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".animate-gradient-flow").getByText("04", { exact: true })).toBeVisible();
});

test("mobile menu can close and reopen without leaving an overlay", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Abrir menu de navegação" });
  for (let i = 0; i < 3; i++) {
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Menu de navegação" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeAttached();
    await expect(trigger).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
