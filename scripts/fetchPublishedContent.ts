import { parseResumeData } from "../src/lib/contentSchema";

const ATTEMPTS = 4;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/** Retry temporary upstream failures without publishing placeholder content. */
export async function fetchPublishedContent(origin: string, anonKey: string) {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let response: Response | undefined;
    let failure: string;
    try {
      response = await fetch(`${origin}/rest/v1/portfolio?id=eq.main&select=data`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        signal: AbortSignal.timeout(20000),
      });
      failure = `HTTP ${response.status}`;
    } catch (error) {
      const transient = error instanceof TypeError ||
        (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name));
      if (!transient) throw error;
      failure = "network error or timeout";
    }

    if (response?.ok) {
      const rows = await response.json();
      if (!Array.isArray(rows) || !rows[0]?.data) {
        throw new Error("Published portfolio missing. Use PRERENDER_SOURCE=template only for an intentional template build.");
      }
      return parseResumeData(rows[0].data);
    }

    if (response && !RETRYABLE_STATUS.has(response.status)) {
      throw new Error(`Cannot read published content for prerender: ${failure}`);
    }
    await response?.body?.cancel();
    if (attempt === ATTEMPTS) {
      throw new Error(`Cannot read published content for prerender after ${ATTEMPTS} attempts: ${failure}. Check Supabase availability and retry the build.`);
    }
    const delay = 1000 * 2 ** (attempt - 1);
    console.warn(`[prerender] Published content unavailable (${failure}); retry ${attempt + 1}/${ATTEMPTS} in ${delay / 1000}s.`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error("Published content could not be loaded.");
}
