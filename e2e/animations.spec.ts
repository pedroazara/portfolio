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

test("pitch shows CNPEM branding and concise experience in slide order", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?dev");
  await page.getByRole("button", { name: "Elevator Pitch", exact: true }).click();
  for (let index = 1; index <= 4; index++) {
    const slide = page.locator('[data-pitch-slide="' + index + '"]');
    await expect(slide).toBeVisible();
    const logo = slide.getByRole("img", { name: "CNPEM", exact: true });
    await expect(logo).toBeVisible();
    const uflaLogo = slide.getByRole("img", { name: "UFLA", exact: true });
    await expect(uflaLogo).toBeVisible();
    await expect.poll(() => uflaLogo.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await expect(slide.getByText("Estágio · SUP de Instrumentação", { exact: true })).toHaveCount(0);
    await expect.poll(() => logo.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    if (index === 2) {
      await expect(slide.getByRole("heading", { name: "Experiência em pesquisa" })).toBeVisible();
      await expect(slide.getByRole("heading", { name: "Experiências extracurriculares" })).toBeVisible();
      for (const skill of ["Sistemas Embarcados", "Eletrônica", "Prototipagem", "Python", "Visão Computacional", "Robótica", "Gestão de Projetos", "Inglês", "Modelagem 3D", "Circuitos Eletrônicos"]) {
        await expect(slide.getByText(skill, { exact: true })).toBeVisible();
      }
      await expect(slide.getByRole("button", { name: "Software", exact: true })).toHaveCount(0);
    }
    if (index < 4) await page.keyboard.press("ArrowRight");
  }
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('[data-pitch-slide="3"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".pitch-slide")).toHaveCount(0);
});

test("research selector keeps all gallery images the same size and supports keyboard", async ({ page }) => {
  const data = {
    ...initialResumeData,
    experiences: [
      { ...initialResumeData.experiences[0], id: "exp-1786823937187", startDate: "2025-09", endDate: "2026-08", current: false, galleryImages: [] },
      { ...initialResumeData.experiences[0], id: "exp-1", startDate: "2023-08", endDate: "2025-09", current: false, galleryImages: [] },
    ],
  };
  await page.addInitScript(data => localStorage.setItem("portfolio_sandbox_data_v2", JSON.stringify(data)), data);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?dev");
  await page.getByRole("button", { name: "Elevator Pitch", exact: true }).click();
  await expect(page.locator('[data-pitch-slide="1"]')).toBeVisible();
  await page.keyboard.press("ArrowRight");
  const slide = page.locator('[data-pitch-slide="2"]');
  const img = slide.locator(".pitch-research-image img");
  await expect(img).toHaveAttribute("src", "/pitch/research/ic-bifenileno-poster.png");
  await page.getByRole("button", { name: /^Iniciação científica 2:/ }).click();
  const sizes: { width: number; height: number }[] = [];
  for (const name of ["kmeans", "trajetoria", "ramachandran"]) {
    await expect(img).toHaveAttribute("src", `/pitch/research/ic-dinamica-${name}.png`);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    sizes.push(await img.evaluate(el => { const { width, height } = el.getBoundingClientRect(); return { width, height }; }));
    await expect(img).toHaveCSS("object-fit", "contain");
    await page.getByRole("button", { name: "Próxima imagem da pesquisa" }).press("Space");
    await expect(slide).toBeVisible();
  }
  expect(sizes[1]).toEqual(sizes[0]);
  expect(sizes[2]).toEqual(sizes[0]);
  await expect(img).toHaveAttribute("src", "/pitch/research/ic-dinamica-kmeans.png");
  await page.getByRole("button", { name: /^Iniciação científica 1:/ }).click();
  await expect(img).toHaveAttribute("src", "/pitch/research/ic-bifenileno-poster.png");
  await expect(page.getByRole("button", { name: "Próxima imagem da pesquisa" })).toHaveCount(0);
});

test("motivation topics appear cumulatively on scroll before the QR code", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?dev");
  await page.getByRole("button", { name: "Elevator Pitch", exact: true }).click();
  await expect(page.locator('[data-pitch-slide="1"]')).toBeVisible();
  for (let index = 1; index < 4; index++) await page.keyboard.press("ArrowRight");

  const slide = page.locator('[data-pitch-slide="4"]');
  const scroll = page.getByTestId("pitch-motivation-scroll");
  await expect(slide.locator("[data-motivation-background] img")).toHaveAttribute("src", "/pitch/sirius-aerial.png");
  await expect(slide.locator('[data-motivation-topic="1"]')).toBeVisible();
  await expect(slide.locator('[data-motivation-topic="2"]')).toHaveCount(0);

  await scroll.evaluate(element => element.scrollTo({ top: element.clientHeight, behavior: "instant" }));
  await expect(slide.locator('[data-motivation-topic="2"]')).toBeVisible();
  await expect(slide.locator('[data-motivation-topic="3"]')).toHaveCount(0);

  await scroll.evaluate(element => element.scrollTo({ top: element.clientHeight * 2, behavior: "instant" }));
  await expect(slide.locator('[data-motivation-topic="3"]')).toBeVisible();
  await expect.poll(() => slide.locator('[data-motivation-topic="3"]').evaluate(element => getComputedStyle(element).opacity)).toBe("1");

  await scroll.evaluate(element => element.scrollTo({ top: element.clientHeight * 3, behavior: "instant" }));
  const qr = slide.getByRole("img", { name: "QR code do site" });
  await expect(qr).toBeVisible();
  await expect(slide.getByText("Obrigado!", { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const [qrBox, slideBox] = await Promise.all([qr.boundingBox(), slide.boundingBox()]);
    if (!qrBox || !slideBox) return Number.POSITIVE_INFINITY;
    const qrCenter = qrBox.x + qrBox.width / 2;
    const slideCenter = slideBox.x + slideBox.width / 2;
    return Math.abs(qrCenter - slideCenter);
  }).toBeLessThan(2);
});

test("public elevator pitch route opens directly without authentication", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/elevator-pitch");

  await expect(page).toHaveURL(/\/elevator-pitch$/);
  await expect(page.locator('[data-pitch-slide="1"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Apresentar" })).toHaveCount(0);

  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-pitch-slide="2"]')).toBeVisible();
});

test("both elevator pitch shortcuts navigate to the public route", async ({ page }) => {
  for (const path of ["/?dev", "/curriculo?dev"]) {
    await page.goto(path);
    const shortcut = page.getByRole("button", { name: "Elevator Pitch", exact: true });
    await expect(shortcut).toBeVisible();
    await shortcut.click();
    await expect(page).toHaveURL(/\/elevator-pitch$/);
    await expect(page.locator('[data-pitch-slide="1"]')).toBeVisible();
  }
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
