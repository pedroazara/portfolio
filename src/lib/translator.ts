/**
 * Utility functions for Gemini AI Auto-Translation API
 */

export interface TranslationResponse {
  translations?: Record<string, string>;
  translation?: string;
  error?: string;
}

/**
 * Translates a single string from Portuguese to English using Gemini AI API.
 */
export async function translateText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "";

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erro de conexão na tradução (${res.status})`);
    }

    const data: TranslationResponse = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return data.translation || "";
  } catch (error: any) {
    console.error("Erro na tradução com Gemini AI:", error);
    throw error;
  }
}

/**
 * Translates multiple Portuguese form fields into English fields simultaneously.
 * Pass a dictionary object of PT fields, e.g. { title: "Engenheiro", description: "..." }
 * Returns a dictionary object of translated EN fields.
 */
export async function translateFields<T extends Record<string, string>>(
  fields: T
): Promise<Partial<T>> {
  // Filter out empty or non-string values
  const validFields: Record<string, string> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (typeof val === "string" && val.trim().length > 0) {
      validFields[key] = val;
    }
  }

  if (Object.keys(validFields).length === 0) {
    return {};
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: validFields }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erro de conexão na tradução (${res.status})`);
    }

    const data: TranslationResponse = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return (data.translations as Partial<T>) || {};
  } catch (error: any) {
    console.error("Erro na tradução de campos com Gemini AI:", error);
    throw error;
  }
}
