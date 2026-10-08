import { expect, test, type Page } from "@playwright/test";
import { initialResumeData } from "../src/data/initialData";

const projectKey = "sandbox:workspace-projects:v1";
const workspaceKey = "sandbox:personal-workspace:v1";
const date = "2026-10-08T12:00:00.000Z";
const project = {
  id: "tracking-test", title: "Bancada de validação", goal: "Validar o protótipo e documentar os resultados.",
  status: "active", due_date: "2026-12-10", task_ids: [], note_ids: [], link_ids: [], next_task_id: null,
  created_at: date, updated_at: date,
};
const requests = new WeakMap<Page, string[]>();
test.use({ timezoneId: "America/Sao_Paulo" });

test.beforeEach(async ({ page }) => {
  const remote: string[] = [];
  requests.set(page, remote);
  page.on("request", (request) => {
    if (/\/rest\/v1\/admin_/.test(request.url()) || (/\/(rest|auth|storage)\/v1\//.test(request.url()) && !["GET", "HEAD"].includes(request.method()))) remote.push(request.url());
  });
  await page.route("**/*", (route) => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.fulfill({ status: 204, body: "" }));
  await page.addInitScript(({ projectKey, workspaceKey, project, resume }) => {
    if (!localStorage.getItem(projectKey)) localStorage.setItem(projectKey, JSON.stringify([project]));
    if (!localStorage.getItem(workspaceKey)) localStorage.setItem(workspaceKey, JSON.stringify({ tasks: [], notes: [], links: [], habits: [], habitLogs: [], drafts: [] }));
    if (!localStorage.getItem("portfolio_sandbox_data_v2")) localStorage.setItem("portfolio_sandbox_data_v2", JSON.stringify(resume));
  }, { projectKey, workspaceKey, project, resume: initialResumeData });
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test.afterEach(async ({ page }) => expect(requests.get(page)).toEqual([]));
const records = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) || "[]"), projectKey);
async function open(page: Page) {
  await page.goto(`/admin/painel/projetos?dev&item=${project.id}`);
  await expect(page.getByRole("heading", { name: project.title, exact: true })).toBeVisible();
}
async function addItem(page: Page, title: string) {
  await page.getByRole("button", { name: "Adicionar item", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Adicionar item ao checklist", exact: true });
  await dialog.getByLabel("O que precisa ser feito?", { exact: true }).fill(title);
  return dialog;
}

test("checklist, etapas e diário persistem com avanço, reabertura e exclusão de etapa sem perder seus itens", async ({ page }) => {
  await open(page);
  const tracking = page.getByRole("region", { name: "Acompanhamento", exact: true });
  await page.getByRole("tab", { name: /^Etapas/ }).click();
  await page.getByRole("button", { name: "Adicionar etapa", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Adicionar etapa", exact: true });
  await dialog.getByLabel("Nome da etapa", { exact: true }).fill("Protótipo de bancada");
  await dialog.getByLabel(/^Prazo/).fill("2026-12-01");
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("tab", { name: /^Checklist/ }).click();
  dialog = await addItem(page, "Calibrar sensor");
  await dialog.getByLabel(/^Prazo/).fill("2025-01-01");
  await dialog.getByLabel("Prioridade", { exact: true }).selectOption("high");
  await dialog.getByLabel("Etapa", { exact: true }).selectOption({ label: "Protótipo de bancada" });
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(tracking).toContainText("Prioridade alta");
  const filters = page.getByRole("group", { name: "Filtrar checklist", exact: true });
  await expect(filters.getByRole("button", { name: /^Atrasados\s*1$/ })).toBeVisible();
  await expect(filters.getByRole("button", { name: /^Pendentes\s*1$/ })).toHaveAttribute("aria-pressed", "true");
  await filters.getByRole("button", { name: /^Atrasados\s*1$/ }).click();
  await expect(filters.getByRole("button", { name: /^Atrasados\s*1$/ })).toHaveAttribute("aria-pressed", "true");
  await expect(filters.getByRole("button", { name: /^Pendentes\s*1$/ })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("checkbox", { name: "Concluir Calibrar sensor", exact: true }).click();
  await expect(tracking.getByRole("progressbar", { name: "100% do checklist concluído" })).toHaveAttribute("value", "1");
  await filters.getByRole("button", { name: /^Concluídos\s*1$/ }).click();
  await expect(filters.getByRole("button", { name: /^Concluídos\s*1$/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("checkbox", { name: "Reabrir Calibrar sensor", exact: true }).click();
  await filters.getByRole("button", { name: /^Todos\s*1$/ }).click();
  await expect(filters.getByRole("button", { name: /^Todos\s*1$/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Editar item Calibrar sensor", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Editar item do checklist", exact: true });
  await dialog.getByLabel("O que precisa ser feito?", { exact: true }).fill("Calibrar sensor e registrar medida");
  await dialog.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("tab", { name: /^Etapas/ }).click();
  await expect(page.getByRole("tabpanel")).toContainText("0/1 itens concluídos");
  await page.getByRole("button", { name: "Concluir etapa Protótipo de bancada", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reabrir etapa Protótipo de bancada", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Excluir etapa Protótipo de bancada", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Excluir etapa?", exact: true });
  await dialog.getByRole("button", { name: "Excluir definitivamente", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("tab", { name: /^Diário/ }).click();
  await page.getByRole("button", { name: "Novo registro", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Novo registro no diário", exact: true });
  await dialog.getByLabel("Tipo de registro", { exact: true }).selectOption("blocker");
  await dialog.getByLabel("O que aconteceu?", { exact: true }).fill("Aguardando sensor de reposição");
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Marcar como resolvido", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Impedimento resolvido");
  await page.reload();
  const saved = (await records(page))[0];
  expect(saved.milestones).toEqual([]);
  expect(saved.checklist_items).toEqual([expect.objectContaining({ title: "Calibrar sensor e registrar medida", completed: false, priority: "high", due_date: "2025-01-01", milestone_id: null })]);
  expect(saved.updates).toEqual([expect.objectContaining({ body: "Aguardando sensor de reposição", kind: "blocker", resolved: true })]);
  await page.getByRole("tab", { name: /^Diário/ }).click();
  await expect(page.getByRole("button", { name: "Reabrir impedimento", exact: true })).toBeVisible();
});

test("falha de gravação preserva o formulário e permite tentar novamente sem duplicar", async ({ page }) => {
  await open(page);
  const dialog = await addItem(page, "Não perder esta entrega");
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function(name, value) {
      if (name === key && fail) { fail = false; throw new DOMException("Quota", "QuotaExceededError"); }
      return original.call(this, name, value);
    };
  }, projectKey);
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("dados anteriores foram preservados");
  await expect(dialog.getByLabel("O que precisa ser feito?", { exact: true })).toHaveValue("Não perder esta entrega");
  expect((await records(page))[0].checklist_items ?? []).toEqual([]);
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect((await records(page))[0].checklist_items).toHaveLength(1);
});

test("conflito mantém o rascunho e incorpora a entrega adicionada em outra sessão", async ({ page }) => {
  await open(page);
  const dialog = await addItem(page, "Entrega desta sessão");
  await page.evaluate(key => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    saved[0].updated_at = new Date(Date.now() + 1000).toISOString();
    saved[0].checklist_items = [{ id: "other", title: "Entrega de outra sessão", due_date: null, completed: false, priority: "medium", milestone_id: null }];
    localStorage.setItem(key, JSON.stringify(saved));
  }, projectKey);
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("alterado");
  await dialog.getByRole("button", { name: "Recarregar dados", exact: true }).click();
  await expect(dialog.getByLabel("O que precisa ser feito?", { exact: true })).toHaveValue("Entrega desta sessão");
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect((await records(page))[0].checklist_items.map((item: { title: string }) => item.title)).toEqual(["Entrega de outra sessão", "Entrega desta sessão"]);
});

for (const width of [320, 1440]) for (const dark of [false, true]) {
  test(`acompanhamento e diálogos cabem em ${width}px, tema ${dark ? "escuro" : "claro"}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem("portfolio_dark_mode_v1", String(value)), dark);
    await open(page);
    for (const [tab, button, dialogName] of [["Checklist", "Adicionar item", "Adicionar item ao checklist"], ["Etapas", "Adicionar etapa", "Adicionar etapa"], ["Diário", "Novo registro", "Novo registro no diário"]]) {
      await page.getByRole("tab", { name: new RegExp(`^${tab}`) }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (tab === "Checklist") {
        const filters = page.getByRole("group", { name: "Filtrar checklist", exact: true });
        await expect(filters.getByRole("button")).toHaveCount(4);
        for (const filter of await filters.getByRole("button").all()) {
          await expect(filter).toBeVisible();
          const filterBox = await filter.boundingBox();
          expect(filterBox!.x).toBeGreaterThanOrEqual(0);
          expect(filterBox!.x + filterBox!.width).toBeLessThanOrEqual(width);
        }
      }
      await page.getByRole("button", { name: button, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: dialogName, exact: true });
      const box = await dialog.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    }
    await page.screenshot({ path: `test-results/tracking-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
  });
}
