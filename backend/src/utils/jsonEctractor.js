/**
* Robustly extract JSON from an LLM response string.
* Handles: markdown code fences, trailing garbage, partial objects.
*
* Strategy (in order):
*  1. Direct JSON.parse of the whole string
*  2. Strip ``` fences and retry
*  3. Find the first { ... } block and parse that
*  4. Attempt to fix common issues (trailing commas, unquoted keys)
*  5. Return null and log if all attempts fail
*/
export function extractJSON(raw) {
    if (!raw || typeof raw !== "string") return null;
   
   
    // Attempt 1: Direct parse
    try {
      return JSON.parse(raw);
    } catch (_) {}
   
   
    // Attempt 2: Strip markdown fences
    const stripped = raw
      .replace(/^```(?:json)?\s*/im, "")
      .replace(/\s*```\s*$/im, "")
      .trim();
    try {
      return JSON.parse(stripped);
    } catch (_) {}
   
   
    // Attempt 3: Extract first JSON object
    const objMatch = stripped.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch (_) {}
    }
   
   
    // Attempt 4: Light repair — trailing commas, single quotes
    const repaired = stripped
      .replace(/,\s*([}\]])/g, "$1") // trailing commas
      .replace(/'/g, '"') // single → double quotes
      .replace(/(\w+)\s*:/g, '"$1":'); // unquoted keys
    try {
      return JSON.parse(repaired);
    } catch (_) {}
   
   
    // Attempt 5: Try the repaired obj block
    const repairedObjMatch = repaired.match(/\{[\s\S]*\}/);
    if (repairedObjMatch) {
      try {
        return JSON.parse(repairedObjMatch[0]);
      } catch (_) {}
    }
   
   
    console.warn("[extractJSON] All parse attempts failed. Raw:", raw.slice(0, 300));
    return null;
   }
   
   
   /** Validate that a triage result has the required shape. Fill defaults where safe. */
   export function validateTriageResult(obj) {
    if (!obj || typeof obj !== "object") return null;
   
   
    const VALID_CATEGORIES = [
      "billing",
      "technical",
      "account",
      "feature_request",
      "complaint",
      "general",
    ];
    const VALID_PRIORITIES = ["critical", "high", "medium", "low"];
    const VALID_SENTIMENTS = ["positive", "neutral", "negative", "frustrated"];
   
   
    return {
      category: VALID_CATEGORIES.includes(obj.category?.toLowerCase())
        ? obj.category.toLowerCase()
        : "general",
      priority: VALID_PRIORITIES.includes(obj.priority?.toLowerCase())
        ? obj.priority.toLowerCase()
        : "medium",
      sentiment: VALID_SENTIMENTS.includes(obj.sentiment?.toLowerCase())
        ? obj.sentiment.toLowerCase()
        : "neutral",
      summary: typeof obj.summary === "string" ? obj.summary.slice(0, 300) : "No summary available.",
      key_fields: Array.isArray(obj.key_fields) ? obj.key_fields.slice(0, 8) : [],
      suggested_reply:
        typeof obj.suggested_reply === "string"
          ? obj.suggested_reply.slice(0, 600)
          : "Thank you for reaching out. We will look into this shortly.",
      confidence: typeof obj.confidence === "number" ? Math.min(1, Math.max(0, obj.confidence)) : 0.5,
      parse_fallback: obj._fallback || false,
    };
   }
   