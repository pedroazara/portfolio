import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel Serverless Function
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    const { text, texts } = req.body || {};

    if (!text && (!texts || typeof texts !== "object" || Object.keys(texts).length === 0)) {
      return res.status(400).json({ error: "Nenhum texto fornecido para tradução." });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Chave GEMINI_API_KEY não encontrada nas variáveis de ambiente da Vercel. Adicione GEMINI_API_KEY no painel da Vercel (Settings -> Environment Variables).",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    if (texts && typeof texts === "object") {
      const filteredEntries = Object.entries(texts).filter(
        ([_, val]) => typeof val === "string" && (val as string).trim().length > 0
      );

      if (filteredEntries.length === 0) {
        return res.status(200).json({ translations: {} });
      }

      const inputMap = Object.fromEntries(filteredEntries);

      const prompt = `Você é um tradutor especialista acadêmico e profissional em currículos e portfólios.
Traduza os valores dos textos fornecidos no objeto JSON do Português (PT-BR) para um Inglês fluente, natural e profissional.
Mantenha a precisão de termos técnicos (física, engenharia, óptica, programação, instrumentação).
Mantenha a formatação original (quebras de linha, listas, markdown se houver).
Retorne APENAS um objeto JSON válido mapeando as mesmas chaves para os valores traduzidos em inglês.

JSON de entrada:
${JSON.stringify(inputMap, null, 2)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const responseText = response.text || "{}";
      let parsed = {};
      try {
        parsed = JSON.parse(responseText);
      } catch (err) {
        console.error("Erro ao interpretar JSON de resposta do Gemini:", responseText);
      }

      return res.status(200).json({ translations: parsed });
    } else if (text) {
      const prompt = `Traduza o seguinte texto do Português (PT-BR) para um Inglês profissional e fluente para currículo/portfólio. Mantenha a precisão técnica e termos acadêmicos. Retorne APENAS o texto traduzido, sem aspas adicionais, explicações ou notas.

Texto:
${text}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      });

      return res.status(200).json({ translation: response.text?.trim() || "" });
    }
  } catch (error: any) {
    console.error("Erro na API Vercel /api/translate:", error);
    return res.status(500).json({
      error: error.message || "Erro interno ao processar tradução com Gemini AI.",
    });
  }
}
