import { describe, expect, it } from "vitest";
import { initialResumeData } from "../../data/initialData";
import { normalizeProject, parseResumeData } from "../contentSchema";
describe("portfolio validation", () => {
  it("accepts the seed without mutating it", () => { const data = structuredClone(initialResumeData); expect(parseResumeData(data).profile.name).toBe(data.profile.name); expect(data).toEqual(initialResumeData); });
  it("normalizes legacy project fields", () => { const p = normalizeProject({ id: "a", title: "A", repositoryUrl: "https://example.com", technologies: ["TS"] }); expect(p.githubUrl).toBe("https://example.com"); expect(p.stack).toEqual(["TS"]); expect(p).not.toHaveProperty("repositoryUrl"); });
  it("preserves canonical values", () => { expect(normalizeProject({ id: "a", title: "A", githubUrl: "https://new.test", repositoryUrl: "https://old.test" }).githubUrl).toBe("https://new.test"); });
  it("rejects duplicate ids", () => { const data = structuredClone(initialResumeData); data.projects = [{ id: "a", title: "A" }, { id: "a", title: "B" }] as any; expect(() => parseResumeData(data)).toThrow(/repetidos/); });
  it("rejects invalid field types", () => { expect(() => parseResumeData({ ...initialResumeData, projects: [{ id: "a", title: "A", draft: "false" }] })).toThrow(); });
  it("rejects executable URL schemes", () => { expect(() => parseResumeData({ ...initialResumeData, customUrl: "javascript:alert(1)" })).toThrow(/insegura/); });
  it("rejects prototype pollution keys", () => { expect(() => parseResumeData(JSON.parse('{"__proto__":{}}'))).toThrow(/inválido/); });
});
