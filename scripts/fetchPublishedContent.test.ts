import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchPublishedContent } from "./fetchPublishedContent";
import { initialResumeData } from "../src/data/initialData";

const request = vi.fn<typeof fetch>();
const success = () => Response.json([{ data: initialResumeData }]);

beforeEach(() => {
  vi.useFakeTimers();
  request.mockReset();
  vi.stubGlobal("fetch", request);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("recovers from repeated 504 responses and reads the published content", async () => {
  request.mockResolvedValueOnce(new Response(null, { status: 504 }))
    .mockResolvedValueOnce(new Response(null, { status: 504 }))
    .mockResolvedValueOnce(success());
  const result = fetchPublishedContent("https://example.test", "test-key");
  await vi.runAllTimersAsync();
  expect((await result).profile.name).toBe(initialResumeData.profile.name);
  expect(request).toHaveBeenCalledTimes(3);
});

it.each([new TypeError("fetch failed"), new DOMException("Timed out", "TimeoutError")])("retries transient fetch failures", async error => {
  request.mockRejectedValueOnce(error).mockResolvedValueOnce(success());
  const result = fetchPublishedContent("https://example.test", "test-key");
  await vi.runAllTimersAsync();
  expect((await result).profile.name).toBe(initialResumeData.profile.name);
  expect(request).toHaveBeenCalledTimes(2);
});

it("stops after four attempts without returning template data", async () => {
  request.mockImplementation(async () => new Response(null, { status: 503 }));
  const result = expect(fetchPublishedContent("https://example.test", "test-key")).rejects.toThrow("after 4 attempts: HTTP 503");
  await vi.runAllTimersAsync();
  await result;
  expect(request).toHaveBeenCalledTimes(4);
});

it.each([401, 403, 404])("does not retry configuration or authorization errors (%s)", async status => {
  request.mockResolvedValueOnce(new Response(null, { status }));
  await expect(fetchPublishedContent("https://example.test", "test-key")).rejects.toThrow(`HTTP ${status}`);
  expect(request).toHaveBeenCalledTimes(1);
});

it("rejects missing published content immediately", async () => {
  request.mockResolvedValueOnce(Response.json([]));
  await expect(fetchPublishedContent("https://example.test", "test-key")).rejects.toThrow("Published portfolio missing");
  expect(request).toHaveBeenCalledTimes(1);
});
