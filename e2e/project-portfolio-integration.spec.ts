import { expect, test, type Page } from "@playwright/test";
import { initialResumeData } from "../src/data/initialData";
import type { AdminWorkspaceProject } from "../src/lib/workspaceProjectsService";
import type { Project } from "../src/types";

const projectKey = "sandbox:workspace-projects:v1";
const workspaceKey = "sandbox:personal-workspace:v1";
const portfolioKey = "portfolio_sandbox_data_v2";
const timestamp = "2026-10-08T12:00:00-03:00";
const published: Project = {
  id: "public-sensor",
  codigo: "sensor-optico",
  title: "Sensor óptico",
  description: "Construir uma bancada de medição óptica.",
  categoryId: "instrumentacao",
  tags: ["Python"],
  draft: false,
};
const draft: Project = {
  ...published,
  id: "public-draft",
  codigo: "bancada-em-preparo",
  title: "Bancada em preparo",
  description: "Investigar a próxima versão da bancada.",
  draft: true,
};
const tracked: AdminWorkspaceProject = {
  id: "tracking-sensor",
  title: "Minha execução da bancada",
  goal: "Concluir três medições antes da revisão.",
  due_date: "2026-11-02",
  status: "active",
  task_ids: [],
  note_ids: ["private-note"],
  link_ids: [],
  next_task_id: null,
  portfolio_project_id: published.id,
  checklist_items: [
    {
      id: "check-measure",
      title: "Calibrar o sensor",
      completed: false,
      due_date: "2026-10-20",
      priority: "high",
      milestone_id: "milestone-prototype",
    },
  ],
  milestones: [
    {
      id: "milestone-prototype",
      title: "Protótipo validado",
      due_date: "2026-10-25",
      completed: false,
    },
  ],
  updates: [
    {
      id: "update-decision",
      body: "Usar o detector disponível no laboratório.",
      kind: "decision",
      resolved: false,
      created_at: timestamp,
    },
  ],
  created_at: timestamp,
  updated_at: timestamp,
};
const workspace = {
  tasks: [],
  notes: [
    {
      id: "private-note",
      title: "Notas da bancada",
      content: "Decisão privada do projeto.",
      created_at: timestamp,
      updated_at: timestamp,
    },
  ],
  links: [],
  habits: [],
  habitLogs: [],
  drafts: [],
};
const remoteWrites = new WeakMap<Page, string[]>();

test.use({ timezoneId: "America/Sao_Paulo" });

test.beforeEach(async ({ page }) => {
  const requests: string[] = [];
  remoteWrites.set(page, requests);
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
      json: [
        {
          data: { ...initialResumeData, projects: [published, draft] },
          updated_at: timestamp,
        },
      ],
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

test.afterEach(async ({ page }) => expect(remoteWrites.get(page)).toEqual([]));

async function seed(page: Page, projects: AdminWorkspaceProject[] = []) {
  await page.addInitScript(
    ({
      projectKey,
      workspaceKey,
      portfolioKey,
      projects,
      workspace,
      portfolio,
    }) => {
      if (!localStorage.getItem(projectKey))
        localStorage.setItem(projectKey, JSON.stringify(projects));
      if (!localStorage.getItem(workspaceKey))
        localStorage.setItem(workspaceKey, JSON.stringify(workspace));
      if (!localStorage.getItem(portfolioKey))
        localStorage.setItem(portfolioKey, JSON.stringify(portfolio));
    },
    {
      projectKey,
      workspaceKey,
      portfolioKey,
      projects,
      workspace,
      portfolio: { ...initialResumeData, projects: [published, draft] },
    },
  );
}

async function records(page: Page): Promise<AdminWorkspaceProject[]> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "[]"),
    projectKey,
  );
}

async function changePortfolio(page: Page, projects: Project[]) {
  await page.evaluate(
    ({ portfolioKey, projects }) => {
      const data = JSON.parse(localStorage.getItem(portfolioKey)!);
      localStorage.setItem(portfolioKey, JSON.stringify({ ...data, projects }));
    },
    { portfolioKey, projects },
  );
  await page.reload();
}

test("a portfolio project starts private tracking once and keeps the public content untouched", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/admin/painel/projetos?dev");
  await page.getByRole("button", { name: /^Do portfólio/ }).click();
  const publicCard = page.getByRole("button", {
    name: /Publicado Sensor óptico/,
  });
  await expect(publicCard).toContainText("Iniciar acompanhamento");
  await publicCard.click();
  const editor = page.getByRole("dialog", {
    name: "Novo projeto",
    exact: true,
  });
  await expect(
    editor.getByLabel("Nome do projeto", { exact: true }),
  ).toHaveValue(published.title);
  await expect(editor.getByLabel(/^Objetivo/)).toHaveValue(
    published.description,
  );
  await expect(editor.getByLabel(/^Projeto do portfólio/)).toHaveValue(
    published.id,
  );
  expect(await records(page)).toEqual([]);
  await editor
    .getByRole("button", { name: "Criar projeto", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  const [saved] = await records(page);
  expect(saved.portfolio_project_id).toBe(published.id);
  expect(saved.checklist_items).toEqual([]);
  const connection = page.getByRole("region", {
    name: "Vínculo com o portfólio",
    exact: true,
  });
  await expect(
    connection.getByRole("link", { name: "Ver no site", exact: true }),
  ).toHaveAttribute("href", "/projetos/sensor-optico");
  await page
    .getByRole("button", { name: "Todos os projetos", exact: true })
    .click();
  await page.getByRole("button", { name: /^Do portfólio/ }).click();
  await expect(publicCard).toContainText("Abrir acompanhamento");
  await publicCard.click();
  await expect(page).toHaveURL(new RegExp(`item=${saved.id}`));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: published.title, level: 1, exact: true }),
  ).toBeVisible();
  expect(await records(page)).toHaveLength(1);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).projects,
      portfolioKey,
    ),
  ).toEqual([published, draft]);
});

test("the portfolio shortcut opens existing tracking and a canceled new shortcut stays closed", async ({
  page,
}) => {
  await seed(page, [tracked]);
  await page.goto(`/admin/painel/projetos?dev&portfolio=${published.id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: tracked.title, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/item=tracking-sensor/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await records(page)).toHaveLength(1);
  await page.goto(`/admin/painel/projetos?dev&portfolio=${draft.id}`);
  const editor = page.getByRole("dialog", {
    name: "Novo projeto",
    exact: true,
  });
  await expect(
    editor.getByLabel("Nome do projeto", { exact: true }),
  ).toHaveValue(draft.title);
  await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page).not.toHaveURL(/portfolio=/);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Projetos pessoais",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await records(page)).toHaveLength(1);
});

test("draft projects have an editor link but no published-page link", async ({
  page,
}) => {
  await seed(page, [{ ...tracked, portfolio_project_id: draft.id }]);
  await page.goto(`/en/admin/painel/projetos?dev&item=${tracked.id}`);
  const connection = page.getByRole("region", {
    name: "Vínculo com o portfólio",
    exact: true,
  });
  await expect(connection).toContainText(draft.title);
  await expect(connection).toContainText("Rascunho");
  await expect(
    connection.getByRole("link", { name: "Ver no site", exact: true }),
  ).toHaveCount(0);
  await expect(
    connection.getByRole("link", { name: "Editar conteúdo", exact: true }),
  ).toHaveAttribute("href", "/en/admin/projetos/bancada-em-preparo");
});

test("linking and unlinking preserve the custom objective, checklist, milestones and private notes", async ({
  page,
}) => {
  await seed(page, [{ ...tracked, portfolio_project_id: null }]);
  await page.goto(`/admin/painel/projetos?dev&item=${tracked.id}`);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  const editor = page.getByRole("dialog", {
    name: "Editar projeto",
    exact: true,
  });
  await editor.getByLabel(/^Projeto do portfólio/).selectOption(published.id);
  await expect(editor.getByLabel(/^Objetivo/)).toHaveValue(tracked.goal);
  await expect(
    editor.getByLabel("Nome do projeto", { exact: true }),
  ).toHaveValue(tracked.title);
  await editor
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  const connection = page.getByRole("region", {
    name: "Vínculo com o portfólio",
    exact: true,
  });
  await expect(connection).toContainText(published.title);
  await connection
    .getByRole("button", { name: "Alterar vínculo", exact: true })
    .click();
  await editor.getByLabel(/^Projeto do portfólio/).selectOption(draft.id);
  await expect(editor.getByLabel(/^Objetivo/)).toHaveValue(tracked.goal);
  await editor
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  await expect(connection).toContainText(draft.title);
  await connection
    .getByRole("button", { name: "Alterar vínculo", exact: true })
    .click();
  await editor.getByLabel(/^Projeto do portfólio/).selectOption("");
  await editor
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  await expect(connection).toContainText(
    "Conecte este acompanhamento ao seu site",
  );
  expect((await records(page))[0]).toMatchObject({
    ...tracked,
    portfolio_project_id: null,
    updated_at: expect.any(String),
  });
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).notes,
      workspaceKey,
    ),
  ).toEqual(workspace.notes);
});

test("a public rename changes the link target and removing public content preserves tracking", async ({
  page,
}) => {
  await seed(page, [tracked]);
  await page.goto(`/admin/painel/projetos?dev&item=${tracked.id}`);
  const connection = page.getByRole("region", {
    name: "Vínculo com o portfólio",
    exact: true,
  });
  await expect(connection).toContainText(published.title);
  const renamed = {
    ...published,
    title: "Sensor óptico revisado",
    codigo: "sensor-revisado",
  };
  await changePortfolio(page, [renamed, draft]);
  await expect(connection).toContainText(renamed.title);
  await expect(
    connection.getByRole("link", { name: "Ver no site", exact: true }),
  ).toHaveAttribute("href", "/projetos/sensor-revisado");
  await expect(
    connection.getByRole("link", { name: "Editar conteúdo", exact: true }),
  ).toHaveAttribute("href", "/admin/projetos/sensor-revisado");
  expect((await records(page))[0]).toEqual(tracked);
  await changePortfolio(page, [draft]);
  await expect(connection).toContainText("Projeto do portfólio indisponível");
  await expect(
    page.getByRole("heading", { level: 1, name: tracked.title, exact: true }),
  ).toBeVisible();
  await expect(connection.getByRole("link")).toHaveCount(0);
  expect((await records(page))[0]).toEqual(tracked);
  await connection
    .getByRole("button", { name: "Alterar vínculo", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Editar projeto",
    exact: true,
  });
  await editor.getByLabel(/^Projeto do portfólio/).selectOption("");
  await editor
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  expect((await records(page))[0].checklist_items).toEqual(
    tracked.checklist_items,
  );
  expect((await records(page))[0].portfolio_project_id).toBeNull();
});

test("portfolio selection and its editor fit a narrow mobile screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await seed(page);
  await page.goto("/admin/painel/projetos?dev");
  await page.getByRole("button", { name: /^Do portfólio/ }).click();
  await expect(
    page.getByRole("button", { name: /Publicado Sensor óptico/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Publicado Sensor óptico/ }).click();
  const editor = page.getByRole("dialog", {
    name: "Novo projeto",
    exact: true,
  });
  await expect(editor).toBeVisible();
  const box = await editor.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
});

test("stored project covers load in the portfolio catalog and tracking detail", async ({
  page,
}) => {
  const coverPath = "projects/sensor-optico/cover.webp";
  await page.route("**/api/image?**", (route) => {
    expect(new URL(route.request().url()).searchParams.get("path")).toBe(
      coverPath,
    );
    return route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="#8b5cf6"/></svg>',
    });
  });
  await seed(page, [tracked]);
  await page.goto("/admin/painel/projetos?dev");
  await changePortfolio(page, [
    { ...published, imageUrl: `db:${coverPath}` },
    draft,
  ]);
  await page.getByRole("button", { name: /^Do portfólio/ }).click();
  const publicCard = page.getByRole("button", {
    name: /Publicado Sensor óptico/,
  });
  const catalogCover = publicCard.locator("img");
  await expect(catalogCover).toBeVisible();
  await expect
    .poll(() =>
      catalogCover.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await publicCard.click();
  const detailCover = page
    .getByRole("region", { name: "Vínculo com o portfólio", exact: true })
    .locator("img");
  await expect(detailCover).toBeVisible();
  await expect
    .poll(() =>
      detailCover.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
});
