import { beforeEach, expect, it, vi } from "vitest";
import { initialResumeData } from "../../data/initialData";
const mocks = vi.hoisted(() => ({ from: vi.fn(), sandbox: vi.fn(() => false) }));
vi.mock("../supabase", () => ({ supabase: { from: mocks.from }, isSupabaseConfigured: true, PORTFOLIO_TABLE: "portfolio", PORTFOLIO_ROW_ID: "main" }));
vi.mock("../devPreview", () => ({ isDevPreview: mocks.sandbox }));
import { saveResumeData, StaleWriteError } from "../dataService";
beforeEach(() => { vi.clearAllMocks(); mocks.sandbox.mockReturnValue(false); });
it("rejects sandbox writes before accessing Supabase", async () => {
  mocks.sandbox.mockReturnValue(true);
  await expect(saveResumeData(initialResumeData, "v1")).rejects.toThrow(/bloqueada/);
  expect(mocks.from).not.toHaveBeenCalled();
});
it("detects another tab updating the expected version", async () => {
  const query = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  mocks.from.mockReturnValue(query);
  await expect(saveResumeData(initialResumeData, "v1")).rejects.toBeInstanceOf(StaleWriteError);
  expect(query.eq).toHaveBeenCalledWith("updated_at", "v1");
});
it("keeps the timestamp returned by the database", async () => {
  const query = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue({ data: [{ updated_at: "server-v2" }], error: null }) };
  mocks.from.mockReturnValue(query);
  await expect(saveResumeData(initialResumeData, "v1")).resolves.toBe("server-v2");
});
it("treats an insert race as a conflict, never an overwrite", async () => {
  const query = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } }) };
  mocks.from.mockReturnValue(query);
  await expect(saveResumeData(initialResumeData, null)).rejects.toBeInstanceOf(StaleWriteError);
});
