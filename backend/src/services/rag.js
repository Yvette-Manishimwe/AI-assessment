import { ollamaGenerate } from "./ollama.js";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";


const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIR = join(__dirname, "../../data/knowledge-base");


// ─── Simple in-memory vector store using TF-IDF cosine similarity ──────────
// Design decision: No external vector DB (Chroma, Pinecone) to keep zero-dependency.
// For production, swap this with pgvector or a dedicated embedding service.


let documents = []; // { id, title, content, chunks: [{text, tokens}] }
let initialized = false;


/** Tokenize text into lowercase words, stripping punctuation. */
function tokenize(text) {
 return text
   .toLowerCase()
   .replace(/[^a-z0-9\s]/g, " ")
   .split(/\s+/)
   .filter(Boolean);
}


/** Build a term-frequency map for a token array. */
function termFreq(tokens) {
 const tf = {};
 for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
 const max = Math.max(...Object.values(tf), 1);
 for (const t in tf) tf[t] /= max; // normalize
 return tf;
}


/** Cosine similarity between two TF maps. */
function cosineSim(a, b) {
 const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
 let dot = 0, magA = 0, magB = 0;
 for (const k of keys) {
   const va = a[k] || 0, vb = b[k] || 0;
   dot += va * vb;
   magA += va * va;
   magB += vb * vb;
 }
 const denom = Math.sqrt(magA) * Math.sqrt(magB);
 return denom === 0 ? 0 : dot / denom;
}


/** Split text into overlapping chunks of ~300 tokens. */
function chunkText(text, chunkSize = 300, overlap = 50) {
 const tokens = tokenize(text);
 const chunks = [];
 for (let i = 0; i < tokens.length; i += chunkSize - overlap) {
   const slice = tokens.slice(i, i + chunkSize);
   chunks.push({ text: slice.join(" "), tokens: slice, tf: termFreq(slice) });
   if (i + chunkSize >= tokens.length) break;
 }
 return chunks;
}


/** Load all .txt and .md files from the knowledge base directory. */
export function initKnowledgeBase() {
 if (initialized) return;
 documents = [];


 let files;
 try {
   files = readdirSync(KB_DIR).filter((f) => f.endsWith(".md") || f.endsWith(".txt"));
 } catch {
   console.warn("[rag] Knowledge base directory not found:", KB_DIR);
   initialized = true;
   return;
 }


 for (const file of files) {
   const content = readFileSync(join(KB_DIR, file), "utf-8").trim();
   const title = file.replace(/\.(md|txt)$/, "").replace(/_/g, " ");
   const chunks = chunkText(content);
   documents.push({ id: file, title, content, chunks });
   console.log(`[rag] Loaded "${title}" (${chunks.length} chunks)`);
 }


 initialized = true;
 console.log(`[rag] Knowledge base ready: ${documents.length} documents`);
}


/**
* Retrieve top-k most relevant chunks for a query.
* Returns [{docId, title, text, score}]
*/
function retrieve(query, topK = 3) {
 const qTokens = tokenize(query);
 const qTF = termFreq(qTokens);


 const results = [];
 for (const doc of documents) {
   for (const chunk of doc.chunks) {
     const score = cosineSim(qTF, chunk.tf);
     results.push({ docId: doc.id, title: doc.title, text: chunk.text, score });
   }
 }


 results.sort((a, b) => b.score - a.score);
 return results.slice(0, topK);
}


// Design decision: "not in knowledge base" threshold.
// A cosine similarity < 0.05 means the query shares almost no vocabulary with any chunk,
// strongly indicating the KB has no relevant information. This avoids hallucination.
const RELEVANCE_THRESHOLD = 0.05;


const RAG_PROMPT = (query, context, citations) => `You are a helpful knowledge base assistant. Answer the user's question using ONLY the provided context below.


RULES:
1. If the context does not contain enough information, say: "I don't have enough information in the knowledge base to answer this question."
2. Always cite which document your answer comes from using [Doc: Title] format.
3. Be concise and factual. Do not invent information.
4. If partially answered, give what you know and note what's missing.


CONTEXT:
${context}


USER QUESTION: ${query}


Answer (cite sources using [Doc: Title]):`;


/**
* Answer a RAG question with citations.
* @param {string} query
* @param {Array} history - [{role, content}] chat history
*/
export async function answerQuestion(query, history = []) {
 if (!initialized) initKnowledgeBase();


 const chunks = retrieve(query, 4);
 const topScore = chunks[0]?.score || 0;


 // Not in KB: return early without calling LLM
 if (topScore < RELEVANCE_THRESHOLD || documents.length === 0) {
   return {
     answer:
       "I don't have enough information in the knowledge base to answer this question. Please try rephrasing, or this topic may not be covered in the available documents.",
     citations: [],
     retrieved_chunks: [],
     in_kb: false,
     top_score: topScore,
   };
 }


 // Filter to relevant chunks only (avoid padding with noise)
 const relevantChunks = chunks.filter((c) => c.score >= RELEVANCE_THRESHOLD);
 const uniqueDocs = [...new Map(relevantChunks.map((c) => [c.docId, c])).values()];


 const contextBlock = relevantChunks
   .map((c, i) => `[${i + 1}] From "${c.title}":\n${c.text}`)
   .join("\n\n---\n\n");


 const citations = uniqueDocs.map((c) => ({ title: c.title, docId: c.docId }));


 const answer = await ollamaGenerate(RAG_PROMPT(query, contextBlock, citations), {
   temperature: 0.2,
   maxTokens: 512,
 });


 return {
   answer,
   citations,
   retrieved_chunks: relevantChunks.map((c) => ({
     title: c.title,
     score: Math.round(c.score * 1000) / 1000,
     excerpt: c.text.split(" ").slice(0, 30).join(" ") + "...",
   })),
   in_kb: true,
   top_score: topScore,
 };
}


/** List available documents in the knowledge base. */
export function listDocuments() {
 if (!initialized) initKnowledgeBase();
 return documents.map((d) => ({
   id: d.id,
   title: d.title,
   chunks: d.chunks.length,
   preview: d.content.slice(0, 200) + "...",
 }));
}
