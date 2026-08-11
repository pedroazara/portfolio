/**
 * Utility functions for Gemini AI Auto-Translation API
 */
import { GoogleGenAI } from "@google/genai";

export interface TranslationResponse {
  translations?: Record<string, string>;
  translation?: string;
  error?: string;
}

/**
 * Fallback client-side translation using VITE_GEMINI_API_KEY if serverless route is unreachable
 */
async function clientSideTranslateFields<T extends Record<string, string>>(
  validFields: Record<string, string>
): Promise<Partial<T>> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Serviço de tradução indisponível. Certifique-se de configurar a variável GEMINI_API_KEY no painel da Vercel (Settings -> Environment Variables)."
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Você é um tradutor especialista acadêmico e profissional em currículos e portfólios.
Traduza os valores dos textos fornecidos no objeto JSON do Português (PT-BR) para um Inglês fluente, natural e profissional.
Mantenha a precisão de termos técnicos (física, engenharia, óptica, programação, instrumentação).
Mantenha a formatação original (quebras de linha, listas, markdown se houver).
Retorne APENAS um objeto JSON válido mapeando as mesmas chaves para os valores traduzidos em inglês.

JSON de entrada:
${JSON.stringify(validFields, null, 2)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const responseText = response.text || "{}";
  return JSON.parse(responseText);
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

    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("application/json")) {
      // Fallback to client-side if server route failed or returned HTML
      const fallbackResult = await clientSideTranslateFields({ text });
      return fallbackResult.text || "";
    }

    const data: TranslationResponse = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return data.translation || "";
  } catch (error: any) {
    console.warn("Rota backend /api/translate falhou, tentando fallback...", error);
    try {
      const fallbackResult = await clientSideTranslateFields({ text });
      return (fallbackResult as any).text || "";
    } catch (fallbackErr: any) {
      console.error("Erro na tradução com Gemini AI:", fallbackErr);
      throw new Error(
        fallbackErr.message ||
          "Não foi possível traduzir o texto. Verifique se a chave GEMINI_API_KEY foi adicionada no painel da Vercel."
      );
    }
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

    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("application/json")) {
      const errData = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
      if (errData.error) {
        throw new Error(errData.error);
      }
      // If server returned non-200 or HTML, try client-side fallback
      return await clientSideTranslateFields<T>(validFields);
    }

    const data: TranslationResponse = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return (data.translations as Partial<T>) || {};
  } catch (error: any) {
    console.warn("Rota /api/translate falhou, tentando fallback cliente...", error);
    try {
      return await clientSideTranslateFields<T>(validFields);
    } catch (fallbackErr: any) {
      console.error("Erro na tradução de campos com Gemini AI:", fallbackErr);
      throw new Error(
        error.message && !error.message.includes("fetch")
          ? error.message
          : fallbackErr.message || "Erro de conexão na tradução. Verifique se a chave GEMINI_API_KEY está configurada na Vercel."
      );
    }
  }
}
