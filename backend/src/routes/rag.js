import { Router } from "express";
import { answerQuestion, listDocuments, initKnowledgeBase } from "../services/rag.js";


export const ragRouter = Router();


// Initialize KB on startup
initKnowledgeBase();


/** POST /api/rag/ask — ask a question */
ragRouter.post("/ask", async (req, res, next) => {
 try {
   const { query, history } = req.body;
   if (!query?.trim()) {
     return res.status(400).json({ error: "query field is required" });
   }
   const result = await answerQuestion(query, history || []);
   res.json(result);
 } catch (err) {
   next(err);
 }
});


/** GET /api/rag/documents — list knowledge base documents */
ragRouter.get("/documents", (req, res) => {
 const docs = listDocuments();
 res.json({ documents: docs, total: docs.length });
});
