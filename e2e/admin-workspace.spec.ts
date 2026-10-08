import { expect, test, type Page } from "@playwright/test";
import { initialResumeData } from "../src/data/initialData";

const workspaceKey = "sandbox:personal-workspace:v1";
const timerKey = "sandbox:focus-timer:v1";
const cloudWrites = new WeakMap<Page, string[]>();
const privateCloudReads = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const writes: string[] = [];
  const privateReads: string[] = [];
  cloudWrites.set(page, writes);
  privateCloudReads.set(page, privateReads);
  page.on("request", request => {
    if (/\/(rest|auth|storage)\/v1\//.test(request.url()) && !["GET", "HEAD"].includes(request.method())) writes.push(request.url());
    if (/\/rest\/v1\/admin_/.test(request.url())) privateReads.push(request.url());
  });
  // No request in this suite may reach an external account or service.
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname)
      ? route.continue()
      : route.fulfill({ status: 204, body: "" });
  });
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [{ data: initialResumeData, updated_at: "2026-10-07T00:00:00Z" }] }));
  await page.route("**/auth/v1/**", route => route.fulfill({ status: 401, json: { error: "Test has no real session" } }));
  await page.route("**/storage/v1/**", route => route.fulfill({ status: 404, body: "" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test.afterEach(async ({ page }) => {
  expect(cloudWrites.get(page), "Preview must never write to a remote service").toEqual([]);
  expect(privateCloudReads.get(page), "Preview must never read private cloud tables").toEqual([]);
});

async function openWorkspace(page: Page) {
  await page.goto("/admin/painel?dev");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Bom dia|Boa tarde|Boa noite/);
  await expect(page.getByRole("link", { name: "Visão geral", exact: true })).toHaveAttribute("aria-current", "page");
}

test("unauthenticated visitors cannot access the private workspace and its pages are not indexed", async ({ page }) => {
  await page.goto("/admin/painel");
  await expect(page.getByRole("heading", { name: "Entre para editar", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("navigation", { name: "Navegação do painel", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nova entrada", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Temporizador de foco", exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), workspaceKey)).toBeNull();
  await page.goto("/admin/painel/notas");
  await expect(page.getByRole("heading", { name: "Entre para editar", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("command palette filters actions, contains keyboard focus, and validates captured links", async ({ page }) => {
  await openWorkspace(page);
  const trigger = page.getByRole("button", { name: "Buscar atalhos", exact: true });
  await trigger.focus();
  await page.keyboard.press("Control+k");
  const commands = page.getByRole("dialog", { name: "Encontre seu próximo passo", exact: true });
  const search = commands.getByRole("textbox", { name: "Buscar páginas e ações", exact: true });
  await expect(search).toBeFocused();
  await search.fill("salvar uma referencia");
  const saveReference = commands.getByRole("button", { name: /^Salvar uma referência/ });
  await expect(saveReference).toBeVisible();
  await expect(commands.getByRole("button", { name: /^Criar uma tarefa/ })).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(saveReference).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(commands.getByRole("button", { name: "Fechar janela", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(saveReference).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(commands).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Control+k");
  await search.fill("salvar uma referencia");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const capture = page.getByRole("dialog", { name: "Captura rápida", exact: true });
  await expect(capture).toBeVisible();
  await expect(commands).not.toBeVisible();
  await expect(capture.getByRole("button", { name: "Link", exact: true })).toHaveAttribute("aria-pressed", "true");
  await capture.getByRole("textbox", { name: "Título", exact: true }).fill("Referência de visualização");
  const url = capture.getByRole("textbox", { name: "Endereço do link", exact: true });
  await url.fill("ftp://example.com/recursos");
  await capture.getByRole("button", { name: "Salvar referência", exact: true }).click();
  await expect(capture.getByRole("alert")).toContainText("começando com https:// ou http://");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"links":[]}').links, workspaceKey)).toEqual([]);
  await url.fill("https://example.com/recursos?origem=painel");
  await capture.getByRole("button", { name: "Salvar referência", exact: true }).click();
  await expect(capture).not.toBeVisible();
  await page.getByRole("link", { name: "Links", exact: true }).click();
  await expect(page.getByRole("link", { name: "Referência de visualização", exact: true })).toHaveAttribute("href", "https://example.com/recursos?origem=painel");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).links.length, workspaceKey)).toBe(1);
});

test("quick capture persists tasks and notes, and completing a task updates the overview", async ({ page }) => {
  await openWorkspace(page);
  for (const name of ["Visão geral", "Tarefas", "Hábitos", "Notas", "Links", "Rascunhos"]) {
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Grandes ideias começam pequenas.", { exact: true })).toBeVisible();

  const capture = page.getByRole("button", { name: "Nova entrada", exact: true });
  await capture.click();
  const dialog = page.getByRole("dialog", { name: "Captura rápida", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Tarefa", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Título", exact: true }).fill("Planejar minha próxima entrega");
  await dialog.getByRole("button", { name: "Salvar tarefa", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Concluir Planejar minha próxima entrega", exact: true })).toBeVisible();
  await expect(capture).toBeFocused();

  await capture.click();
  await dialog.getByRole("button", { name: "Nota", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Título", exact: true }).fill("Uma ideia para o portfólio");
  await dialog.getByRole("button", { name: "Salvar nota", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Uma ideia para o portfólio", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Uma ideia para o portfólio", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Concluir Planejar minha próxima entrega", exact: true }).click();
  await expect(page.getByText("Espaço livre para o próximo passo.", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).tasks[0].status, workspaceKey)).toBe("done");
  await page.reload();
  await expect(page.getByText("Espaço livre para o próximo passo.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("admin:personal-workspace:v1"))).toBeNull();
});

test("focus timer pauses, resumes after reload, and counts a completed session once", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-07T12:00:00Z") });
  await openWorkspace(page);
  await page.clock.pauseAt(new Date("2026-10-07T12:01:00Z"));
  const focus = page.getByRole("region", { name: "Temporizador de foco", exact: true });
  const timer = focus.getByRole("timer");
  const reloadWithClock = async () => {
    await page.reload();
    // React's lazy-module scheduling also uses the mocked clock after navigation.
    await expect.poll(async () => {
      await page.clock.runFor(100);
      return focus.count();
    }).toBe(1);
  };
  await focus.getByRole("button", { name: "15 min", exact: true }).click();
  await expect(timer).toHaveText("15:00");
  await focus.getByRole("button", { name: "Começar foco", exact: true }).click();
  await page.clock.fastForward(65_000);
  await expect(timer).toHaveText("13:55");
  await focus.getByRole("button", { name: "Pausar", exact: true }).click();
  await page.clock.fastForward(30_000);
  await expect(timer).toHaveText("13:55");
  await reloadWithClock();
  await expect(timer).toHaveText("13:55");
  await focus.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.clock.fastForward(60_000);
  await expect(timer).toHaveText("12:55");
  const deadline = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).endAt, timerKey);
  await reloadWithClock();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).endAt, timerKey)).toBe(deadline);
  await expect(focus.getByRole("button", { name: "Pausar", exact: true })).toBeVisible();
  const remaining = await page.evaluate(endAt => Math.ceil((endAt - Date.now()) / 1000), deadline);
  await expect(timer).toHaveText(`${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`);
  await page.clock.fastForward(remaining * 1000);
  await expect(focus.getByRole("status")).toHaveText("Sessão concluída. Respire e faça uma pausa.");
  await expect(focus.getByText("1 sessões · 15 min de foco hoje", { exact: true })).toBeVisible();
  await reloadWithClock();
  await expect(focus.getByText("1 sessões · 15 min de foco hoje", { exact: true })).toBeVisible();
  await focus.getByRole("button", { name: "50 min", exact: true }).click();
  await focus.getByRole("button", { name: "Começar foco", exact: true }).click();
  await page.clock.fastForward(10_000);
  await focus.getByRole("button", { name: "Reiniciar temporizador", exact: true }).click();
  await expect(timer).toHaveText("50:00");
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), timerKey)).toMatchObject({
    duration: 50, remaining: 3000, endAt: null, sessions: 1, minutes: 15,
  });
  expect(await page.evaluate(() => localStorage.getItem("admin:focus-timer:v1"))).toBeNull();
});

test("populated desktop overview reflects saved records in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.clock.setFixedTime(new Date("2026-10-07T13:00:00-03:00"));
  const timestamp = "2026-10-07T12:00:00-03:00";
  const fixture = {
    tasks: [
      { id: "task-1", title: "Publicar o estudo de caso", notes: "Revisar os últimos detalhes e compartilhar o processo.", status: "doing", position: 0, created_at: timestamp, updated_at: timestamp },
      { id: "task-2", title: "Refinar a apresentação do projeto", notes: "Uma narrativa simples para uma ideia importante.", status: "todo", position: 1, created_at: timestamp, updated_at: timestamp },
      { id: "task-3", title: "Explorar referências de visualização", notes: null, status: "todo", position: 2, created_at: timestamp, updated_at: timestamp },
      { id: "task-4", title: "Organizar materiais", notes: null, status: "done", position: 3, created_at: timestamp, updated_at: timestamp },
    ],
    habits: [
      { id: "habit-1", name: "Ler por 20 minutos", archived: false, created_at: timestamp },
      { id: "habit-2", name: "Escrever uma ideia", archived: false, created_at: timestamp },
      { id: "habit-3", name: "Mover o corpo", archived: false, created_at: timestamp },
    ],
    habitLogs: [
      { habit_id: "habit-1", log_date: "2026-10-05" }, { habit_id: "habit-1", log_date: "2026-10-06" },
      { habit_id: "habit-1", log_date: "2026-10-07" }, { habit_id: "habit-2", log_date: "2026-10-07" },
    ],
    notes: [
      { id: "note-1", title: "Ideias para o próximo projeto", content: "Conectar ciência, design e experiências que despertam curiosidade.", created_at: timestamp, updated_at: timestamp },
      { id: "note-2", title: "O que aprendi esta semana", content: "Dar espaço para experimentar. Documentar também faz parte de criar.", created_at: timestamp, updated_at: timestamp },
    ],
    links: [{ id: "link-1", title: "Referências de design", url: "https://example.com", notes: null, tags: ["design"], created_at: timestamp }],
    drafts: [{ id: "draft-1", title: "Contar histórias com dados", content: "Uma reflexão sobre transformar informação em descobertas.", tags: [], created_at: timestamp, updated_at: timestamp }],
  };
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: workspaceKey, data: fixture });
  await openWorkspace(page);
  await expect(page.getByRole("button", { name: "Concluir Publicar o estudo de caso", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ideias para o próximo projeto", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Hábitos de hoje/ })).toContainText("2/3");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/workspace-1440-populated-light.png", fullPage: true });
  await page.getByRole("button", { name: "Ativar tema escuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: "test-results/workspace-1440-populated-dark.png", fullPage: true });
});

for (const width of [320, 390]) {
  for (const dark of [false, true]) {
    test(`workspace and quick capture fit ${width}px in ${dark ? "dark" : "light"} theme`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(value => localStorage.setItem("portfolio_dark_mode_v1", String(value)), dark);
      await openWorkspace(page);
      await expect(page.locator("html")).toHaveClass(dark ? /dark/ : /^(?!.*\bdark\b).*$/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/workspace-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
      await page.getByRole("button", { name: "Nova entrada", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Captura rápida", exact: true });
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      await dialog.getByRole("textbox", { name: "Título", exact: true }).fill("Uma tarefa na tela pequena");
      await dialog.getByRole("button", { name: "Salvar tarefa", exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Concluir Uma tarefa na tela pequena", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
