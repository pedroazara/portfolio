import { describe, expect, it } from "vitest";
import { authorOf, changeLink, describeChange, fieldLabels, summarizeAuthors, type EditLogEntry } from "../editLogService";

const entry = (over: Partial<EditLogEntry>): EditLogEntry => ({
  id: 1,
  created_at: "2026-10-10T10:00:00Z",
  updated_at: "2026-10-10T10:00:00Z",
  source: "painel",
  agent: null,
  session: null,
  tool: null,
  note: null,
  changes: [],
  saves: 1,
  ...over,
});

describe("autoria", () => {
  it("separa você, agentes e sistema", () => {
    expect(authorOf({ source: "painel", agent: null })).toMatchObject({ key: "voce", kind: "voce", label: "Você" });
    expect(authorOf({ source: "sistema", agent: null }).kind).toBe("sistema");
    expect(authorOf({ source: "agente", agent: "claude-code 2.1.0 · portfolio-media" })).toMatchObject({
      key: "agente:claude-code",
      label: "Claude Code",
      detail: "claude-code 2.1.0 · portfolio-media",
    });
    expect(authorOf({ source: "agente", agent: "Claude no notebook" })).toMatchObject({ key: "agente:Claude no notebook", label: "Claude no notebook" });
  });

  it("agrupa por agente sem separar versões ou servidores, contando sessões", () => {
    const summary = summarizeAuthors([
      entry({ id: 4, source: "agente", agent: "claude-code 2.1.1 · portfolio-projects", session: "b", tool: "update_project", updated_at: "2026-10-10T12:00:00Z" }),
      entry({ id: 3, source: "agente", agent: "claude-code 2.1.0 · portfolio-media", session: "a", tool: "upload_image", updated_at: "2026-10-10T11:00:00Z" }),
      entry({ id: 2, source: "agente", agent: "claude-code 2.1.0 · portfolio-projects", session: "a", tool: "update_project" }),
      entry({ id: 1, saves: 5, updated_at: "2026-10-09T09:00:00Z" }),
    ]);
    expect(summary.map((s) => s.author.key)).toEqual(["agente:claude-code", "voce"]);
    expect(summary[0]).toMatchObject({ edits: 3, sessions: 2, tools: ["update_project", "upload_image"], lastAt: "2026-10-10T12:00:00Z" });
    expect(summary[1]).toMatchObject({ edits: 1, saves: 5 });
  });
});

describe("descrição das mudanças", () => {
  it("frases legíveis por ação e coleção", () => {
    expect(describeChange({ collection: "projects", id: "p1", label: "YOLOcraft", action: "alterado" })).toBe("alterou projeto “YOLOcraft”");
    expect(describeChange({ collection: "educations", action: "reordenado" })).toBe("reordenou a lista de formações");
    expect(describeChange({ collection: "images", id: "geral/a.webp", action: "enviado" })).toBe("enviou geral/a.webp");
    expect(describeChange({ collection: "englishTips", action: "alterado" })).toBe("alterou englishTips");
  });

  it("nomes de campos sem repetição", () => {
    expect(fieldLabels(["detailedDescription", "emAndamento", "status", "custom"])).toEqual(["texto da página", "situação", "custom"]);
  });

  it("link para a página do item, exceto removidos", () => {
    expect(changeLink({ collection: "projects", id: "p1", slug: "yolo", action: "alterado" })).toBe("/projetos/yolo");
    expect(changeLink({ collection: "posts", id: "post-1", action: "criado" })).toBe("/blog/post-1");
    expect(changeLink({ collection: "projects", id: "p1", action: "removido" })).toBeNull();
    expect(changeLink({ collection: "profile", id: "profile", action: "alterado" })).toBeNull();
  });
});
