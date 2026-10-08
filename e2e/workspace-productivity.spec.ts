import { expect, test, type Page } from "@playwright/test";
import { initialResumeData } from "../src/data/initialData";

const STORAGE_KEY = "sandbox:personal-workspace:v1";
test.use({ timezoneId: "America/Sao_Paulo" });

test.beforeEach(async ({ page }) => {
  // The entire workspace is exercised in its isolated local preview.
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({
      json: [{ data: initialResumeData, updated_at: "2026-10-07T12:00:00Z" }],
    }),
  );
  await page.route("**/auth/v1/**", (route) =>
    route.fulfill({ status: 401, json: { error: "No real session" } }),
  );
  await page.route("**/storage/v1/**", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.clock.setFixedTime(new Date("2026-10-07T15:00:00-03:00"));
});

async function createTask(page: Page, title: string) {
  await page.getByRole("button", { name: "Nova tarefa", exact: true }).click();
  await page.getByLabel("O que você quer fazer?", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Criar tarefa", exact: true }).click();
  await expect(
    page.getByRole("button", { name: title, exact: true }),
  ).toBeVisible();
}

async function taskState(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "{}").tasks || [],
    STORAGE_KEY,
  );
}

test("task creation, stage changes, filtering and completion survive reload", async ({
  page,
}) => {
  const cloudWrites: string[] = [];
  page.on("request", (request) => {
    if (
      /\/(rest|auth|storage)\/v1\//.test(request.url()) &&
      !["GET", "HEAD"].includes(request.method())
    )
      cloudWrites.push(request.url());
  });
  await page.goto("/admin/painel/tarefas?dev");
  await createTask(page, "Publicar meu próximo projeto");
  await expect(
    page.getByRole("progressbar", { name: "Tarefas concluídas" }),
  ).toHaveAttribute("aria-valuenow", "0");
  const advance = page.getByRole("button", {
    name: "Mover Publicar meu próximo projeto para a próxima coluna",
    exact: true,
  });
  await advance.click();
  await expect
    .poll(async () => (await taskState(page))[0]?.status)
    .toBe("doing");
  await advance.click();
  await expect
    .poll(async () => (await taskState(page))[0]?.status)
    .toBe("done");
  await expect(
    page.getByRole("progressbar", { name: "Tarefas concluídas" }),
  ).toHaveAttribute("aria-valuenow", "100");
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Publicar meu próximo projeto",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Tarefas concluídas" }),
  ).toHaveAttribute("aria-valuenow", "100");
  await page.getByRole("button", { name: "Em aberto", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Publicar meu próximo projeto",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Todas", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar tarefas", exact: true })
    .fill("ausente");
  await expect(
    page.getByRole("button", {
      name: "Publicar meu próximo projeto",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Limpar busca", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Publicar meu próximo projeto",
      exact: true,
    }),
  ).toBeVisible();
  expect(cloudWrites).toEqual([]);
  await page.screenshot({
    path: "test-results/productivity/tasks-desktop.png",
    fullPage: true,
  });
});

test("quick capture updates the task board without resetting its search", async ({
  page,
}) => {
  await page.goto("/admin/painel/tarefas?dev");
  await createTask(page, "Publicar uma ideia");
  const search = page.getByRole("textbox", {
    name: "Buscar tarefas",
    exact: true,
  });
  await search.fill("Publicar");
  await page.getByRole("button", { name: "Nova entrada", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Captura rápida",
    exact: true,
  });
  await dialog
    .getByRole("textbox", { name: "Título", exact: true })
    .fill("Revisar capa do portfólio");
  await dialog
    .getByRole("button", { name: "Salvar tarefa", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(search).toHaveValue("Publicar");
  await page.getByRole("button", { name: "Limpar busca", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Revisar capa do portfólio",
      exact: true,
    }),
  ).toBeVisible();
  await expect.poll(async () => (await taskState(page)).length).toBe(2);
});

test("dragging a first-position task to an empty column persists its changed status", async ({
  page,
}) => {
  await page.goto("/admin/painel/tarefas?dev");
  await createTask(page, "Validar arraste");
  const handle = await page
    .getByRole("button", {
      name: "Arrastar tarefa Validar arraste",
      exact: true,
    })
    .boundingBox();
  const destination = await page
    .getByText("Qual será seu foco agora?", { exact: true })
    .boundingBox();
  expect(handle).not.toBeNull();
  expect(destination).not.toBeNull();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle!.x + handle!.width / 2 + 8,
    handle!.y + handle!.height / 2,
    { steps: 3 },
  );
  await page.mouse.move(
    destination!.x + destination!.width / 2,
    destination!.y + destination!.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await taskState(page))[0]?.status)
    .toBe("doing");
  await page.reload();
  const column = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Em andamento", exact: true }),
  });
  await expect(
    column.getByRole("button", { name: "Validar arraste", exact: true }),
  ).toBeVisible();
});

test("keyboard sorting persists task order", async ({ page }) => {
  await page.goto("/admin/painel/tarefas?dev");
  await createTask(page, "Primeiro passo");
  await createTask(page, "Segundo passo");
  await page
    .getByRole("button", { name: "Arrastar tarefa Segundo passo", exact: true })
    .scrollIntoViewIfNeeded();
  const handle = page.getByRole("button", {
    name: "Arrastar tarefa Primeiro passo",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowDown");
  const secondTask = (await taskState(page)).find(
    (task: { title: string }) => task.title === "Segundo passo",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Draggable item" }),
  ).toContainText(`over droppable area ${secondTask.id}`);
  await page.keyboard.press("Space");
  await expect
    .poll(async () =>
      (await taskState(page))
        .sort(
          (a: { position: number }, b: { position: number }) =>
            a.position - b.position,
        )
        .map((task: { title: string }) => task.title),
    )
    .toEqual(["Segundo passo", "Primeiro passo"]);
});

test("habit check-ins persist, undo correctly, and fit mobile layouts in both themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/admin/painel/habitos?dev");
  await page
    .getByRole("textbox", { name: "Nome do novo hábito", exact: true })
    .fill("Ler 20 páginas");
  await page.getByRole("button", { name: "Criar hábito", exact: true }).click();
  const today = page.getByRole("button", {
    name: "Ler 20 páginas, 7 de outubro",
    exact: true,
  });
  await expect(today).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", {
      name: "Ler 20 páginas, 6 de outubro, antes da criação",
      exact: true,
    }),
  ).toBeDisabled();
  await today.click();
  await expect(
    page.getByRole("progressbar", {
      name: "Hábitos realizados hoje",
      exact: true,
    }),
  ).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByText("1 dia seguido", { exact: true })).toBeVisible();
  await page.reload();
  await expect(today).toHaveAttribute("aria-pressed", "true");
  await today.click();
  await expect(
    page.getByRole("progressbar", {
      name: "Hábitos realizados hoje",
      exact: true,
    }),
  ).toHaveAttribute("aria-valuenow", "0");
  await page.getByRole("button", { name: "30 dias", exact: true }).click();
  await expect(today).toBeVisible();
  await page.screenshot({
    path: "test-results/productivity/habits-mobile-light.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Ativar tema escuro", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: "test-results/productivity/habits-mobile-dark.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("failed task save retains the form and failed habit check-in rolls back", async ({
  page,
}) => {
  await page.goto("/admin/painel/habitos?dev");
  await page
    .getByRole("textbox", { name: "Nome do novo hábito", exact: true })
    .fill("Estudar TypeScript");
  await page.getByRole("button", { name: "Criar hábito", exact: true }).click();
  const today = page.getByRole("button", {
    name: "Estudar TypeScript, 7 de outubro",
    exact: true,
  });
  await expect(today).toBeVisible();
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new Error("Sem espaço para salvar");
      return original.call(this, name, value);
    };
  }, STORAGE_KEY);
  await today.click();
  await expect(today).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("alert").filter({ hasText: "Sem espaço para salvar" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navegação do painel" })
    .getByRole("link", { name: "Tarefas", exact: true })
    .click();
  await page.getByRole("button", { name: "Nova tarefa", exact: true }).click();
  await page
    .getByLabel("O que você quer fazer?", { exact: true })
    .fill("Preservar o rascunho");
  await page.getByRole("button", { name: "Criar tarefa", exact: true }).click();
  await expect(
    page.getByLabel("O que você quer fazer?", { exact: true }),
  ).toHaveValue("Preservar o rascunho");
  await expect(
    page.getByRole("alert").filter({ hasText: "Sem espaço para salvar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Criar tarefa", exact: true }),
  ).toBeEnabled();
});
