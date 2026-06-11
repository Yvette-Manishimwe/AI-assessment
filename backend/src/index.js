import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { triageRouter } from "./routes/triage.js";
import { ragRouter } from "./routes/rag.js";
import { healthRouter } from "./routes/health.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"] }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/health", healthRouter);
app.use("/api/triage", triageRouter);
app.use("/api/rag", ragRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    code: err.code || "INTERNAL_ERROR",
  });
});

app.listen(PORT, () => {
  console.log(` Backend running on http://localhost:${PORT}`);
  console.log(`   Ollama URL: ${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}`);
  console.log(`   Model: ${process.env.OLLAMA_MODEL || "llama3.2"}`);
});
