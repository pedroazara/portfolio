import { expect, test, type Page } from "@playwright/test";
import { initialResumeData } from "../src/data/initialData";

const workspaceKey = "sandbox:personal-workspace:v1";
const privateRequests = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const requests: string[] = [];
  privateRequests.set(page, requests);
  page.on("request", request => {
    if (/\/rest\/v1\/admin_/.test(request.url()) || (/\/(rest|auth|storage)\/v1\//.test(request.url()) && !["GET", "HEAD"].includes(request.method()))) requests.push(request.url());
  });
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.fulfill({ status: 204, body: "" });
  });
  await page.route("**/rest/v1/**", route => route.fulfill({ json: [{ data: initialResumeData, updated_at: "2026-10-07T00:00:00Z" }] }));
  await page.route("**/auth/v1/**", route => route.fulfill({ status: 401, json: { error: "Test has no real session" } }));
  await page.route("**/storage/v1/**", route => route.fulfill({ status: 404, body: "" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  page.on("dialog", dialog => dialog.accept());
});

test.afterEach(async ({ page }) => {
  expect(privateRequests.get(page), "Knowledge panels must never access private cloud data in preview").toEqual([]);
});

async function records(page: Page, collection: "drafts" | "links") {
  return page.evaluate(({ key, collection }) => JSON.parse(localStorage.getItem(key) || "{}")[collection] || [], { key: workspaceKey, collection });
}

test("drafts preserve title, text and comma separated tags across immediate navigation", async ({ page }) => {
  await page.clock.install();
  await page.goto("/admin/painel/rascunhos?dev");
  await page.getByRole("button", { name: "Novo rascunho", exact: true }).click();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole("textbox", { name: "Título do rascunho", exact: true }).fill("A primeira descoberta");
  await page.getByRole("textbox", { name: "Tags separadas por vírgulas", exact: true }).pressSequentially("pesquisa, óptica, pesquisa");
  await page.getByPlaceholder("Escreva em Markdown. Cole (Ctrl+V) ou arraste imagens para inseri-las aqui.", { exact: true }).fill("## Uma hipótese\n\nO conteúdo continua aqui depois da navegação.");
  await expect(page.getByRole("textbox", { name: "Tags separadas por vírgulas", exact: true })).toHaveValue("pesquisa, óptica, pesquisa");
  await page.getByRole("link", { name: /^Links/ }).click();
  await page.clock.fastForward(1300);
  await expect.poll(() => records(page, "drafts")).toMatchObject([{ title: "A primeira descoberta", tags: ["pesquisa", "óptica"], content: "## Uma hipótese\n\nO conteúdo continua aqui depois da navegação." }]);
  await page.reload();
  await page.clock.resume();
  await page.getByRole("link", { name: /^Rascunhos/ }).click();
  await expect(page.getByRole("heading", { name: "A primeira descoberta", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Uma hipótese", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Buscar rascunhos", exact: true }).fill("óptica");
  await expect(page.getByRole("button", { name: /A primeira descoberta/ })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar .md", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("A-primeira-descoberta.md");
});

test("requested item selects the correct draft without resetting typed tags", async ({ page }) => {
  await page.addInitScript(key => {
    const base = { created_at: "2026-10-06T12:00:00Z", updated_at: "2026-10-06T12:00:00Z" };
    localStorage.setItem(key, JSON.stringify({
      tasks: [], habits: [], habitLogs: [], links: [], notes: [],
      drafts: [{ ...base, id: "draft-old", title: "Rascunho antigo", content: "Corpo antigo", tags: ["original"] }, { ...base, id: "draft-new", title: "Rascunho recente", content: "Corpo recente", tags: [], updated_at: "2026-10-07T12:00:00Z" }],
    }));
  }, workspaceKey);
  await page.goto("/admin/painel/rascunhos?dev&item=draft-new");
  await expect(page.getByRole("heading", { name: "Rascunho recente", exact: true })).toBeVisible();
  await page.evaluate(() => {
    history.pushState(null, "", "/admin/painel/rascunhos?dev&item=draft-old");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("heading", { name: "Rascunho antigo", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Escrever", exact: true }).click();
  await page.getByRole("textbox", { name: "Tags separadas por vírgulas", exact: true }).press("End");
  await page.getByRole("textbox", { name: "Tags separadas por vírgulas", exact: true }).pressSequentially(", nova");
  await expect(page.getByRole("textbox", { name: "Tags separadas por vírgulas", exact: true })).toHaveValue("original, nova");
  await expect(page.getByRole("button", { name: "Escrever", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("leaving for the portfolio drains pending edits before navigation", async ({ page }) => {
  await page.clock.install();
  await page.goto("/admin/painel/rascunhos?dev");
  await page.getByRole("button", { name: "Novo rascunho", exact: true }).click();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole("textbox", { name: "Título do rascunho", exact: true }).fill("Antes de sair");
  await page.getByPlaceholder("Escreva em Markdown. Cole (Ctrl+V) ou arraste imagens para inseri-las aqui.", { exact: true }).fill("A saída espera a gravação.");
  await page.getByRole("link", { name: "Pedro Ázara — ir para o portfólio", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => records(page, "drafts")).toMatchObject([{ title: "Antes de sair", content: "A saída espera a gravação." }]);
});

test("failed save prevents leaving the workspace and retains pending text", async ({ page }) => {
  await page.clock.install();
  await page.goto("/admin/painel/rascunhos?dev");
  await page.getByRole("button", { name: "Novo rascunho", exact: true }).click();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(key => {
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name: string, value: string) {
      if (name === key) throw new Error("Falha ao salvar antes de sair");
      return originalSet.call(this, name, value);
    };
  }, workspaceKey);
  await page.getByRole("textbox", { name: "Título do rascunho", exact: true }).fill("Edição importante");
  await page.getByPlaceholder("Escreva em Markdown. Cole (Ctrl+V) ou arraste imagens para inseri-las aqui.", { exact: true }).fill("Este texto precisa continuar aqui.");
  await page.getByRole("link", { name: "Pedro Ázara — ir para o portfólio", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/painel\/rascunhos\?dev$/);
  await expect(page.getByText("Não foi possível salvar seu texto. Tente novamente antes de sair; sua edição continua aqui.", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Escreva em Markdown. Cole (Ctrl+V) ou arraste imagens para inseri-las aqui.", { exact: true })).toHaveValue("Este texto precisa continuar aqui.");
});

test("links normalize addresses, search tags and copy the saved address", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/admin/painel/links?dev");
  await page.getByRole("button", { name: "Salvar link", exact: true }).click();
  await page.getByRole("textbox", { name: "Endereço do link", exact: true }).fill("example.com/pesquisa");
  await page.getByRole("textbox", { name: "Título", exact: true }).fill("Referência de estudo");
  await page.getByRole("textbox", { name: "Tags", exact: true }).fill("óptica, leitura, óptica");
  await page.getByRole("button", { name: "Salvar referência", exact: true }).click();
  await expect(page.getByRole("link", { name: "Referência de estudo", exact: true })).toHaveAttribute("href", "https://example.com/pesquisa");
  await expect.poll(() => records(page, "links")).toMatchObject([{ title: "Referência de estudo", tags: ["óptica", "leitura"] }]);
  await page.getByRole("textbox", { name: "Buscar links", exact: true }).fill("óptica");
  await expect(page.getByRole("link", { name: "Referência de estudo", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copiar link: Referência de estudo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Link copiado", exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://example.com/pesquisa");
  await page.getByRole("textbox", { name: "Buscar links", exact: true }).fill("não existe");
  await expect(page.getByText("Vamos tentar outra busca?", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("link", { name: "Referência de estudo", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
