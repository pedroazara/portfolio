import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Helper to get GoogleGenAI client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({ apiKey });
}

// API endpoint for AI translation using Gemini AI
app.post("/api/translate", async (req, res) => {
  try {
    const { text, texts } = req.body;

    if (!text && (!texts || typeof texts !== "object" || Object.keys(texts).length === 0)) {
      return res.status(400).json({ error: "Nenhum texto fornecido para tradução." });
    }

    const ai = getGeminiClient();

    if (texts && typeof texts === "object") {
      // Filter out empty string fields to save tokens and avoid empty translations
      const filteredEntries = Object.entries(texts).filter(
        ([_, val]) => typeof val === "string" && val.trim().length > 0
      );

      if (filteredEntries.length === 0) {
        return res.json({ translations: {} });
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
        model: "gemini-flash-latest",
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

      return res.json({ translations: parsed });
    } else if (text) {
      const prompt = `Traduza o seguinte texto do Português (PT-BR) para um Inglês profissional e fluente para currículo/portfólio. Mantenha a precisão técnica e termos acadêmicos. Retorne APENAS o texto traduzido, sem aspas adicionais, explicações ou notas.

Texto:
${text}`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      });

      return res.json({ translation: response.text?.trim() || "" });
    }
  } catch (error: any) {
    console.error("Erro na rota /api/translate:", error);
    return res.status(500).json({
      error: error.message || "Erro interno ao processar tradução com Gemini AI.",
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

async function startServer() {
  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
