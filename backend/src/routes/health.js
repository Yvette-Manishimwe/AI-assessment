import { Router } from "express";
import { checkOllamaHealth } from "../services/ollama.js";


export const healthRouter = Router();


healthRouter.get("/", async (req, res) => {
 const ollama = await checkOllamaHealth();
 res.status(ollama.ok ? 200 : 503).json({
   status: ollama.ok ? "ok" : "degraded",
   ollama,
   timestamp: new Date().toISOString(),
 });
});
