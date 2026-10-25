import { beforeEach, expect, it, vi } from "vitest";
import { initialResumeData } from "../../data/initialData";
import type { BlogPost, ResumeData } from "../../types";
vi.mock("../devPreview", () => ({ isDevPreview: () => false }));
import { clearPendingEdits, describeEdits, mergeEdits, readPendingEdits, savePendingEdits } from "../pendingEdits";

const post = (id: string, extra: Partial<BlogPost> = {}): BlogPost =>
  ({ id, title: `Post ${id}`, summary: "", content: "texto", date: "2026-10-25", tags: [], ...extra }) as BlogPost;
const withPosts = (posts: BlogPost[]): ResumeData => ({ ...initialResumeData, posts });

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

it("keeps another tab's change to a field this tab did not touch", () => {
  const base = withPosts([post("a")]);
  const current = withPosts([post("a", { references: [{ title: "PPC", url: "https://ufla.br" }] })]);
  const mine = withPosts([post("a", { content: "meu texto novo" })]);
  expect(mergeEdits(base, current, mine).posts).toEqual([
    post("a", { content: "meu texto novo", references: [{ title: "PPC", url: "https://ufla.br" }] }),
  ]);
});
it("lets this tab win when both sides changed the same field", () => {
  const merged = mergeEdits(withPosts([post("a")]), withPosts([post("a", { content: "deles" })]), withPosts([post("a", { content: "meu" })]));
  expect(merged.posts?.[0].content).toBe("meu");
});
it("adds new items from both sides and honours deletions", () => {
  const base = withPosts([post("a"), post("b")]);
  const current = withPosts([post("a"), post("b"), post("c")]);
  const mine = withPosts([post("d"), post("a")]);
  expect(mergeEdits(base, current, mine).posts?.map((p) => p.id)).toEqual(["d", "a", "c"]);
});
it("keeps an item this tab deleted if the other side edited it", () => {
  const merged = mergeEdits(withPosts([post("a")]), withPosts([post("a", { content: "editado" })]), withPosts([]));
  expect(merged.posts?.map((p) => p.content)).toEqual(["editado"]);
});
it("returns the current version untouched when this tab changed nothing", () => {
  const current = withPosts([post("a", { content: "deles" })]);
  expect(mergeEdits(withPosts([post("a")]), current, withPosts([post("a")]))).toBe(current);
});
it("names the changed items", () => {
  expect(describeEdits(withPosts([post("a"), post("b")]), withPosts([post("a", { content: "novo" }), post("b")]))).toEqual(['Post "Post a"']);
});
it("survives a reload and is cleared only by the tab that saved exactly that state", () => {
  const base = JSON.stringify(withPosts([post("a")]));
  const mine = JSON.stringify(withPosts([post("a", { content: "meu" })]));
  savePendingEdits("aba-1", base, mine);
  expect(readPendingEdits()?.mine.posts?.[0].content).toBe("meu");

  clearPendingEdits({ tab: "aba-2", syncedJson: mine });
  clearPendingEdits({ tab: "aba-1", syncedJson: base });
  expect(readPendingEdits()).not.toBeNull();

  clearPendingEdits({ tab: "aba-1", syncedJson: mine });
  expect(readPendingEdits()).toBeNull();
});
