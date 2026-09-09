import "dotenv/config";
import express from "express";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import translate from "./server/translate";
import image from "./server/image";
import { securityHeaders } from "./server/securityHeaders";

const app = express();
if (process.argv.includes("--production")) process.env.NODE_ENV = "production";
app.disable("x-powered-by");
app.use((_req, res, next) => { res.set(securityHeaders); next(); });
app.use(express.json({ limit: "128kb" }));
app.all("/api/translate", translate);
app.all("/api/image", image);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), "dist");
    app.use(express.static(dist));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  app.listen(Number(process.env.PORT) || 3000, "127.0.0.1", () => console.log(`Server running on http://localhost:${process.env.PORT || 3000}`));
}
startServer();
