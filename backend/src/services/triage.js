import { ollamaGenerate } from "./ollama.js";
import { extractJSON, validateTriageResult } from "../utils/jsonExtractor.js";
import { v4 as uuidv4 } from "uuid";


// In-memory store (replace with Postgres in production)
const triageStore = new Map();


const TRIAGE_PROMPT = (text) => `You are a customer support triage AI. Analyze the following support ticket or feedback and return ONLY a valid JSON object. No markdown, no explanation, just JSON.


TICKET TEXT:
"""
${text}
"""


Return this exact JSON schema:
{
 "category": "<one of: billing | technical | account | feature_request | complaint | general>",
 "priority": "<one of: critical | high | medium | low>",
 "sentiment": "<one of: positive | neutral | negative | frustrated>",
 "summary": "<1-2 sentence summary of the core issue>",
 "key_fields": [
   {"field": "<field name>", "value": "<extracted value>"}
 ],
 "suggested_reply": "<professional, empathetic reply draft under 100 words>",
 "confidence": <float 0.0-1.0 representing your classification confidence>
}


Priority rules:
- critical: system down, data loss, security issue, revenue blocked
- high: core feature broken, customer angry/at risk of churn
- medium: degraded experience, workaround exists
- low: cosmetic issue, feature request, general inquiry


Extract key_fields such as: product name, error codes, account IDs, dates mentioned, affected features.
Return ONLY the JSON object.`;


/**
* Triage a single support ticket.
* Retries once with a stricter prompt on parse failure.
*/
export async function triageTicket(text) {
 if (!text?.trim()) {
   throw Object.assign(new Error("Ticket text is required"), { status: 400 });
 }


 let raw = await ollamaGenerate(TRIAGE_PROMPT(text), { temperature: 0.05 });
 let parsed = extractJSON(raw);


 // Retry with even simpler prompt on failure
 if (!parsed) {
   console.warn("[triage] First parse failed, retrying with simplified prompt...");
   const retryPrompt = `Classify this support ticket. Return ONLY JSON, no other text:\n"${text.slice(0, 500)}"\n\n{"category":"general","priority":"medium","sentiment":"neutral","summary":"${text.slice(0, 80)}","key_fields":[],"suggested_reply":"Thank you for your message. We will look into this.","confidence":0.5}`;
   raw = await ollamaGenerate(retryPrompt, { temperature: 0 });
   parsed = extractJSON(raw);
 }


 // Last resort: build a minimal valid result
 if (!parsed) {
   console.error("[triage] Both parse attempts failed. Using fallback.");
   parsed = {
     category: "general",
     priority: "medium",
     sentiment: "neutral",
     summary: text.slice(0, 200),
     key_fields: [],
     suggested_reply:
       "Thank you for reaching out. A support agent will review your request shortly.",
     confidence: 0.1,
     _fallback: true,
   };
 }


 const validated = validateTriageResult(parsed);
 const ticket = {
   id: uuidv4(),
   original_text: text,
   ...validated,
   created_at: new Date().toISOString(),
 };


 triageStore.set(ticket.id, ticket);
 return ticket;
}


/** List all triaged tickets, with optional filters. */
export function listTickets({ category, priority, sentiment } = {}) {
 let tickets = Array.from(triageStore.values()).sort(
   (a, b) => new Date(b.created_at) - new Date(a.created_at)
 );


 if (category) tickets = tickets.filter((t) => t.category === category);
 if (priority) tickets = tickets.filter((t) => t.priority === priority);
 if (sentiment) tickets = tickets.filter((t) => t.sentiment === sentiment);


 return tickets;
}


/** Get a single ticket by ID. */
export function getTicket(id) {
 return triageStore.get(id) || null;
}


/** Delete a ticket (for demo reset). */
export function deleteTicket(id) {
 return triageStore.delete(id);
}


/** Seed some example tickets for demo purposes. */
export function seedExampleTickets() {
 const examples = [
   {
     id: uuidv4(),
     original_text: "I've been charged twice for my subscription this month. Order #4521. Please refund immediately.",
     category: "billing",
     priority: "high",
     sentiment: "frustrated",
     summary: "Customer was double-charged for subscription and is requesting an immediate refund.",
     key_fields: [{ field: "order_id", value: "#4521" }, { field: "issue", value: "duplicate charge" }],
     suggested_reply: "Hi! I sincerely apologize for the double charge on your account. I've flagged order #4521 for immediate review and our billing team will process your refund within 2-3 business days. You'll receive a confirmation email shortly.",
     confidence: 0.95,
     parse_fallback: false,
     created_at: new Date(Date.now() - 3600000).toISOString(),
   },
   {
     id: uuidv4(),
     original_text: "The dashboard completely crashed after the latest update. I can't access any of my projects. This is blocking our entire team from working.",
     category: "technical",
     priority: "critical",
     sentiment: "frustrated",
     summary: "Post-update dashboard crash blocking entire team from accessing projects.",
     key_fields: [{ field: "affected_feature", value: "dashboard" }, { field: "trigger", value: "latest update" }],
     suggested_reply: "I understand this is critically urgent — a full team outage is unacceptable. I'm escalating this to our engineering team right now. Can you share your account ID and which browser/OS you're using so we can reproduce and fix this immediately?",
     confidence: 0.97,
     parse_fallback: false,
     created_at: new Date(Date.now() - 7200000).toISOString(),
   },
   {
     id: uuidv4(),
     original_text: "Would love to see dark mode added to the mobile app. It would make night-time use so much easier!",
     category: "feature_request",
     priority: "low",
     sentiment: "positive",
     summary: "User requesting dark mode feature for the mobile application.",
     key_fields: [{ field: "requested_feature", value: "dark mode" }, { field: "platform", value: "mobile app" }],
     suggested_reply: "Thanks for the great suggestion! Dark mode is definitely on our roadmap. I've added your vote to this feature request — you'll be notified as soon as it's released. Thanks for helping us improve!",
     confidence: 0.98,
     parse_fallback: false,
     created_at: new Date(Date.now() - 10800000).toISOString(),
   },
 ];


 examples.forEach((t) => triageStore.set(t.id, t));
 console.log(`[triage] Seeded ${examples.length} example tickets`);
}
