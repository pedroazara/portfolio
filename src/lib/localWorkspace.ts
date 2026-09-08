import { isDevPreview } from "./devPreview";
import { parseResumeData } from "./contentSchema";
import type { ResumeData } from "../types";

export const workspaceKey = () => isDevPreview() ? "portfolio_sandbox_data_v2" : "curriculo_portfolio_data_v1";
export const scopedKey = (name: string) => `${isDevPreview() ? "sandbox" : "admin"}:${name}`;
export function readLocalData() {
  const raw = localStorage.getItem(workspaceKey());
  return raw ? parseResumeData(JSON.parse(raw)) : null;
}
export function downloadJson(data: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export interface Revision { id: string; at: string; data: ResumeData; fields: string[] }
export function changedFields(a: any, b: any, prefix = ""): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) || Array.isArray(b)) return [prefix || "documento"];
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => changedFields(a[k], b[k], prefix ? `${prefix}.${k}` : k));
}
export function readRevisions(): Revision[] {
  try { return JSON.parse(localStorage.getItem(scopedKey("revisions")) || "[]"); } catch { return []; }
}
export function recordRevision(previous: ResumeData, next: ResumeData) {
  const fields = changedFields(previous, next);
  if (!fields.length) return;
  const entries = [{ id: crypto.randomUUID(), at: new Date().toISOString(), data: previous, fields }, ...readRevisions()].slice(0, 15);
  while (entries.length) {
    try { localStorage.setItem(scopedKey("revisions"), JSON.stringify(entries)); return; }
    catch { entries.pop(); }
  }
  throw new Error("Sem espaço para salvar o histórico local. Exporte um backup.");
}
