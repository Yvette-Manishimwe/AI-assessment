import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();


const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.2";


/**
* Send a prompt to Ollama and return the raw text response.
* @param {string} prompt
* @param {object} options - { model, temperature, stream }
* @returns {Promise<string>}
*/
export async function ollamaGenerate(prompt, options = {}) {
 const model = options.model || DEFAULT_MODEL;
 const temperature = options.temperature ?? 0.1; // Low temp for structured tasks


 const body = {
   model,
   prompt,
   stream: false,
   options: {
     temperature,
     num_predict: options.maxTokens || 1024,
     stop: options.stop || [],
   },
 };


 const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify(body),
   signal: AbortSignal.timeout(60_000), // 60s timeout
 });


 if (!res.ok) {
   const text = await res.text();
   throw Object.assign(new Error(`Ollama error ${res.status}: ${text}`), {
     code: "OLLAMA_ERROR",
     status: 502,
   });
 }


 const data = await res.json();
 return data.response?.trim() || "";
}


/**
* Send a chat-style conversation to Ollama (/api/chat).
* @param {Array<{role: string, content: string}>} messages
* @param {object} options
* @returns {Promise<string>}
*/
export async function ollamaChat(messages, options = {}) {
 const model = options.model || DEFAULT_MODEL;


 const body = {
   model,
   messages,
   stream: false,
   options: {
     temperature: options.temperature ?? 0.3,
     num_predict: options.maxTokens || 1024,
   },
 };


 const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify(body),
   signal: AbortSignal.timeout(90_000),
 });


 if (!res.ok) {
   const text = await res.text();
   throw Object.assign(new Error(`Ollama chat error ${res.status}: ${text}`), {
     code: "OLLAMA_ERROR",
     status: 502,
   });
 }


 const data = await res.json();
 return data.message?.content?.trim() || "";
}


/** Check if Ollama is reachable and the model is available. */
export async function checkOllamaHealth() {
 try {
   const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
     signal: AbortSignal.timeout(5000),
   });
   if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
   const data = await res.json();
   const models = data.models?.map((m) => m.name) || [];
   return { ok: true, models, url: OLLAMA_BASE_URL };
 } catch (err) {
   return { ok: false, error: err.message };
 }
}
