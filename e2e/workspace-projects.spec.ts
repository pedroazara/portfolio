import { expect, test, type Page } from "@playwright/test";
import { initialResumeData } from "../src/data/initialData";

const projectKey = "sandbox:workspace-projects:v1";
const workspaceKey = "sandbox:personal-workspace:v1";
const timestamp = "2026-10-07T12:00:00-03:00";
const projectId = "project-bench";
const fixture = {
  tasks: [
    {
      id: "task-measure",
      title: "Medir a resposta do sensor",
      notes: "Usar três frequências de referência.",
      status: "todo",
      position: 0,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: "task-calibrate",
      title: "Calibrar a bancada",
      notes: null,
      status: "done",
      position: 1,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ],
  notes: [
    {
      id: "note-hypothesis",
      title: "Hipótese de trabalho",
      content: "Comparar a resposta com o modelo antes da próxima medida.",
      created_at: timestamp,
      updated_at: timestamp,
    },
  ],
  links: [
    {
      id: "link-source",
      title: "Manual do sensor",
      url: "https://example.com/sensor",
      notes: null,
      tags: ["instrumentação"],
      created_at: timestamp,
    },
  ],
  habits: [],
  habitLogs: [],
  drafts: [],
};
const project = {
  id: projectId,
  title: "Bancada de espectroscopia",
  goal: "Validar a aquisição e documentar os resultados.",
  due_date: "2026-10-30",
  status: "active",
  task_ids: ["task-calibrate", "task-measure"],
  note_ids: [],
  link_ids: [],
  next_task_id: "task-measure",
  created_at: timestamp,
  updated_at: timestamp,
};
const remoteRequests = new WeakMap<Page, string[]>();
test.use({ timezoneId: "America/Sao_Paulo" });

test.beforeEach(async ({ page }) => {
  const requests: string[] = [];
  remoteRequests.set(page, requests);
  page.on("request", (request) => {
    if (
      /\/rest\/v1\/admin_/.test(request.url()) ||
      (/\/(rest|auth|storage)\/v1\//.test(request.url()) &&
        !["GET", "HEAD"].includes(request.method()))
    )
      requests.push(request.url());
  });
  await page.route("**/*", (route) =>
    ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.fulfill({ status: 204, body: "" }),
  );
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({
      json: [{ data: initialResumeData, updated_at: timestamp }],
    }),
  );
  await page.route("**/auth/v1/**", (route) =>
    route.fulfill({ status: 401, json: { error: "No real session" } }),
  );
  await page.route("**/storage/v1/**", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test.afterEach(async ({ page }) =>
  expect(remoteRequests.get(page)).toEqual([]),
);

async function seed(page: Page, projects = [project]) {
  await page.addInitScript(
    ({ workspaceKey, projectKey, fixture, projects }) => {
      if (!localStorage.getItem(workspaceKey))
        localStorage.setItem(workspaceKey, JSON.stringify(fixture));
      if (!localStorage.getItem(projectKey))
        localStorage.setItem(projectKey, JSON.stringify(projects));
    },
    { workspaceKey, projectKey, fixture, projects },
  );
}
async function projectRecords(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "[]"),
    projectKey,
  );
}
async function workspaceRecords(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "{}"),
    workspaceKey,
  );
}
async function openProject(page: Page) {
  await page.goto(`/admin/painel/projetos?dev&item=${projectId}`);
  await expect(
    page.getByRole("heading", { name: project.title, exact: true }),
  ).toBeVisible();
}

test("overview creates a project, task and concrete next action that persist across routes and reload", async ({
  page,
}) => {
  await seed(page, []);
  await page.goto("/admin/painel?dev");
  await page
    .getByRole("region", { name: "Projetos em foco", exact: true })
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  const form = page.getByRole("dialog", { name: "Novo projeto", exact: true });
  await expect(form).toBeVisible();
  await form
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Automatizar a bancada");
  await form
    .getByLabel(/^Objetivo/)
    .fill("Medir sem repetir configurações manuais.");
  await form.getByLabel(/^Prazo/).fill("2026-11-15");
  await form.getByLabel("Status", { exact: true }).selectOption("planned");
  await form
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(form).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Automatizar a bancada", exact: true }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/item=new/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Automatizar a bancada", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Novo projeto", exact: true }),
  ).toHaveCount(0);
  const tasks = page.getByRole("region", {
    name: "Tarefas do projeto",
    exact: true,
  });
  await tasks.getByRole("button", { name: "Adicionar", exact: true }).click();
  const add = page.getByRole("dialog", {
    name: "Adicionar ações",
    exact: true,
  });
  await add
    .getByLabel("O que precisa ser feito?", { exact: true })
    .fill("Conectar o osciloscópio");
  await add
    .getByRole("button", { name: "Adicionar tarefa", exact: true })
    .click();
  await expect(add).not.toBeVisible();
  const nextTask = tasks.getByRole("listitem").filter({
    hasText: "Conectar o osciloscópio",
  });
  await expect(nextTask).toHaveCount(1);
  await expect(nextTask.getByText("Próxima", { exact: true })).toBeVisible();
  await tasks
    .getByRole("button", {
      name: "Concluir Conectar o osciloscópio",
      exact: true,
    })
    .click();
  await expect(tasks.getByRole("progressbar")).toHaveAttribute("value", "1");
  await expect(tasks).toContainText("100%");
  const saved = (await projectRecords(page))[0];
  expect(saved).toMatchObject({
    title: "Automatizar a bancada",
    due_date: "2026-11-15",
    status: "planned",
  });
  expect(saved.task_ids).toHaveLength(1);
  expect(saved.next_task_id).toBe(saved.task_ids[0]);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  const editor = page.getByRole("dialog", {
    name: "Editar projeto",
    exact: true,
  });
  await editor.getByLabel("Status", { exact: true }).selectOption("active");
  await editor
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  await page.getByRole("link", { name: "Visão geral", exact: true }).click();
  const card = page.getByRole("button", {
    name: "Abrir projeto Automatizar a bancada",
    exact: true,
  });
  await expect(card).toContainText("1/1 ações concluídas");
  await card.click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Automatizar a bancada", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Tarefas do projeto", exact: true }),
  ).toContainText("100%");
  expect((await projectRecords(page))[0].status).toBe("active");
});

test("linking, unlinking and deleting a project preserve the original notes, links and tasks", async ({
  page,
}) => {
  await seed(page);
  await openProject(page);
  const notes = page.getByRole("region", {
    name: "Notas do projeto",
    exact: true,
  });
  await notes.getByRole("button", { name: "Vincular", exact: true }).click();
  let picker = page.getByRole("dialog", {
    name: "Vincular notas",
    exact: true,
  });
  await picker
    .getByRole("searchbox", { name: "Buscar notas para vincular", exact: true })
    .fill("Hipótese");
  await picker.getByRole("checkbox", { name: /Hipótese de trabalho/ }).check();
  await picker
    .getByRole("button", { name: "Salvar vínculos", exact: true })
    .click();
  await expect(notes).toContainText("Hipótese de trabalho");
  const links = page.getByRole("region", {
    name: "Links do projeto",
    exact: true,
  });
  await links.getByRole("button", { name: "Vincular", exact: true }).click();
  picker = page.getByRole("dialog", { name: "Vincular links", exact: true });
  await picker.getByRole("checkbox", { name: /Manual do sensor/ }).check();
  await picker
    .getByRole("button", { name: "Salvar vínculos", exact: true })
    .click();
  await expect(links).toContainText("Manual do sensor");
  await expect(
    links.getByRole("link", {
      name: "Abrir referência Manual do sensor em nova aba",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://example.com/sensor");
  await notes.getByRole("button", { name: /^Hipótese de trabalho/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Título da nota", exact: true }),
  ).toHaveValue("Hipótese de trabalho");
  await openProject(page);
  await page
    .getByRole("button", {
      name: "Desvincular nota Hipótese de trabalho",
      exact: true,
    })
    .click();
  await expect(
    notes.getByRole("button", { name: /^Hipótese de trabalho/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Excluir projeto Bancada de espectroscopia",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog", { name: "Excluir este projeto?", exact: true })
    .getByRole("button", { name: "Excluir projeto", exact: true })
    .click();
  await expect.poll(() => projectRecords(page)).toEqual([]);
  const original = await workspaceRecords(page);
  expect(original.tasks).toEqual(fixture.tasks);
  expect(original.notes).toEqual(fixture.notes);
  expect(original.links).toEqual(fixture.links);
});

test("next action skips removed and completed tasks, and project search opens the chosen record", async ({
  page,
}) => {
  await seed(page, [
    {
      ...project,
      task_ids: ["task-gone", "task-calibrate", "task-measure"],
      next_task_id: "task-gone",
    },
  ]);
  await page.goto("/admin/painel?dev");
  await page
    .getByRole("button", { name: "Buscar atalhos", exact: true })
    .click();
  const commands = page.getByRole("dialog", {
    name: "Encontre seu próximo passo",
    exact: true,
  });
  await commands
    .getByRole("textbox", { name: "Buscar páginas e ações", exact: true })
    .fill("espectroscopia");
  await commands
    .getByRole("button", { name: /^Bancada de espectroscopia/ })
    .click();
  const tasks = page.getByRole("region", {
    name: "Tarefas do projeto",
    exact: true,
  });
  const nextTask = tasks.getByRole("listitem").filter({
    hasText: "Medir a resposta do sensor",
  });
  await expect(nextTask).toHaveCount(1);
  await expect(nextTask.getByText("Próxima", { exact: true })).toBeVisible();
  await expect(tasks).toContainText("1 de 2 concluídas");
  await nextTask
    .getByRole("button", { name: "Medir a resposta do sensor", exact: true })
    .click();
  const taskEditor = page.getByRole("dialog", {
    name: "Ajustar tarefa",
    exact: true,
  });
  await expect(
    taskEditor.getByLabel("O que você quer fazer?", { exact: true }),
  ).toHaveValue("Medir a resposta do sensor");
  await taskEditor
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await openProject(page);
  await nextTask
    .getByRole("button", {
      name: "Concluir Medir a resposta do sensor",
      exact: true,
    })
    .click();
  await expect(tasks.getByText("Próxima", { exact: true })).toHaveCount(0);
  await expect(tasks).toContainText("2 de 2 concluídas");
  expect((await projectRecords(page))[0].status).toBe("active");
});

test("a failed project link can retry without creating a duplicate task", async ({
  page,
}) => {
  await seed(page);
  await openProject(page);
  await page
    .getByRole("region", { name: "Tarefas do projeto", exact: true })
    .getByRole("button", { name: "Adicionar", exact: true })
    .click();
  const add = page.getByRole("dialog", {
    name: "Adicionar ações",
    exact: true,
  });
  await add
    .getByLabel("O que precisa ser feito?", { exact: true })
    .fill("Registrar o ruído de fundo");
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function (name, value) {
      if (name === key && fail) {
        fail = false;
        throw new DOMException("Sem espaço", "QuotaExceededError");
      }
      return original.call(this, name, value);
    };
  }, projectKey);
  await add
    .getByRole("button", { name: "Adicionar tarefa", exact: true })
    .click();
  await expect(add.getByRole("alert")).toContainText(
    "A tarefa foi criada no quadro",
  );
  expect(
    (await workspaceRecords(page)).tasks.filter(
      (task: { title: string }) => task.title === "Registrar o ruído de fundo",
    ),
  ).toHaveLength(1);
  await add
    .getByRole("button", { name: "Vincular tarefa criada", exact: true })
    .click();
  await expect(add).not.toBeVisible();
  await expect(
    page.getByRole("region", { name: "Tarefas do projeto", exact: true }),
  ).toContainText("Registrar o ruído de fundo");
  expect(
    (await workspaceRecords(page)).tasks.filter(
      (task: { title: string }) => task.title === "Registrar o ruído de fundo",
    ),
  ).toHaveLength(1);
});

test("unavailable project storage preserves data and does not block other workspace tools", async ({
  page,
}) => {
  await seed(page);
  await page.addInitScript(
    (key) => localStorage.setItem(key, "damaged-project-data"),
    projectKey,
  );
  await page.goto("/admin/painel/projetos?dev");
  await expect(page.getByRole("alert")).toContainText(
    "Os dados salvos foram preservados",
  );
  await expect(
    page.getByRole("button", { name: "Novo projeto", exact: true }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Tarefas", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Medir a resposta do sensor",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), projectKey),
  ).toBe("damaged-project-data");
});

for (const width of [320, 390]) {
  for (const dark of [false, true]) {
    test(`project details and linking dialogs fit ${width}px in ${dark ? "dark" : "light"} theme`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(
        (value) =>
          localStorage.setItem("portfolio_dark_mode_v1", String(value)),
        dark,
      );
      await seed(page);
      await openProject(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/projects-${width}-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
      await page
        .getByRole("region", { name: "Notas do projeto", exact: true })
        .getByRole("button", { name: "Vincular", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Vincular notas",
        exact: true,
      });
      const box = await dialog.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      await dialog
        .getByRole("checkbox", { name: /Hipótese de trabalho/ })
        .check();
      await dialog
        .getByRole("button", { name: "Salvar vínculos", exact: true })
        .click();
      await expect(dialog).not.toBeVisible();
      await expect(
        page.getByRole("region", { name: "Notas do projeto", exact: true }),
      ).toContainText("Hipótese de trabalho");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}
