# Decision Memo: LLM Assessment Technical Choices

## 1. Model Choice: Llama 3.2 (3B) via Ollama

**Why Llama 3.2 3B:**
Llama 3.2 3B hits the sweet spot for "zero-dollar hardware." It runs comfortably in 4GB RAM with Ollama's GGUF Q4_K_M quantization, produces coherent structured output with good instruction-following, and has strong multilingual support. The 3B variant sacrifices some reasoning depth vs the 8B, but the latency reduction (2-5s vs 8-12s on CPU) matters for a real-time triage demo.

**Alternatives considered:**
- `qwen2.5:3b` — marginally better at JSON generation, but Llama 3.2 has wider community testing
- `phi3:mini` — smaller (3.8B) and fast, but weaker at following complex triage schemas
- `llama3.2:8b` — better quality, but requires ~6GB RAM and is too slow for free-tier CI

**Serving approach:** Ollama with GGUF Q4_K_M quantization (4-bit integer). Quality loss vs FP16 is negligible for classification tasks. Ollama handles model loading, batching, and CUDA/Metal acceleration automatically.

---

## 2. Triage Schema Design (the ambiguous point)

**What was under-specified:** "the exact triage schema"

**My decision:** I chose a 7-field schema optimized for support team workflows rather than a minimal 3-field schema.

Fields and reasoning:
- `category` — routes to the right team queue (billing, technical, etc.)
- `priority` — determines SLA and escalation path. My 4-tier definition (critical/high/medium/low) maps to real business impact, not just urgency
- `sentiment` — separate from priority; a low-priority issue from a frustrated enterprise customer still needs gentle handling
- `summary` — saves agents from reading the full ticket before deciding to engage
- `key_fields` — extracted entities (order IDs, error codes, account emails) that agents would otherwise manually hunt for
- `suggested_reply` — a draft that agents can edit in ~10 seconds vs write from scratch (~2 min)
- `confidence` — enables routing: high confidence → auto-queue, low confidence → human review. I set `parse_fallback: true` when JSON parsing fails entirely so the dashboard can surface unreliable results

**Priority rule justification:** "Critical" means a whole team can't work or revenue is blocked. This definition comes from standard SLA frameworks (P1/P2/P3/P4) and is more useful than purely sentiment-based priority.

---

## 3. Retrieval Strategy: TF-IDF vs Embeddings

**Decision:** TF-IDF cosine similarity over overlapping chunks (300 tokens, 50-token overlap)

**Why not embeddings:** Semantic embeddings (e.g., `nomic-embed-text` via Ollama) would give better recall on paraphrased questions. However, they require a second model running concurrently, add ~200ms latency per query for encoding, and introduce an additional point of failure. For a demo with a small, well-structured KB (4 documents), TF-IDF performs well because the user's vocabulary closely matches the documents.

**Production upgrade path:** Swap the TF-IDF retriever for pgvector + Ollama's `nomic-embed-text`. The `rag.js` service is structured so the `retrieve()` function is the only change point.

**Chunking:** 300-token chunks with 50-token overlap balances coverage (not too large to dilute relevance) with context (not so small that answers are fragmented). The overlap prevents cutting a sentence mid-thought.

---

## 4. "Not in Knowledge Base" Threshold (the ambiguous point)

**What was under-specified:** "what counts as 'not in the knowledge base'"

**My decision:** Cosine similarity threshold of **0.05**

**Reasoning:** A score below 0.05 means the query shares essentially zero vocabulary with any document chunk. This is a strong signal the KB has no relevant content. I chose *not* to call the LLM in this case — instead returning a canned "not in KB" message. This eliminates hallucination at the cost of some edge-case false negatives.

The 0.05 threshold was calibrated empirically: questions clearly in scope score 0.08–0.35; off-topic questions (e.g., "what's the weather?") score < 0.02.

**Alternative approach I considered:** Call the LLM with the top chunks regardless and prompt it to say "I don't know." This gives better UX for borderline cases but risks confabulation when the model has strong priors (e.g., general knowledge about billing). The pre-retrieval cutoff is safer and faster.

---

## 5. Hallucination & Invalid Output Handling

**Structured generation (Triage):**
- Temperature set to 0.05 for classification tasks — near-deterministic output reduces JSON malformation
- 3-tier JSON extraction: direct parse → strip fences → extract block → repair
- Retry with temperature=0 and 1-shot example on first failure
- Hard fallback: safe defaults + `parse_fallback: true` flag
- Schema validation with `validateTriageResult()` normalizes out-of-vocabulary labels

**RAG grounding:**
- System prompt instructs model to cite sources or say "I don't have enough information"
- Pre-retrieval threshold check prevents calling the LLM on off-topic queries
- Top-k chunks are filtered by relevance before injection (no padding with irrelevant context)
- UI shows retrieved chunks with scores for transparency

---

## 6. Latency vs Hardware Trade-offs

| Hardware | Model | Avg latency (triage) | Avg latency (RAG) |
|----------|-------|---------------------|-------------------|
| MacBook M2 | llama3.2:3b | ~1.5s | ~2s |
| 4-core CPU VM, 8GB RAM | llama3.2:3b | ~4-6s | ~6-8s |
| Free-tier Colab GPU (T4) | llama3.2:3b | ~0.6s | ~0.8s |

For production, I'd move to llama3.2:8b on a GPU instance for noticeably better structured output quality. The 3B model occasionally produces verbose replies or minor JSON formatting quirks that the repair pipeline catches — the 8B avoids these more consistently.

---

## 7. Tech Stack Choices

- **Node.js + Express** over FastAPI: The assessment mentioned Node familiarity as a plus; Express has minimal overhead for this use case
- **Next.js 14 App Router**: Matches the assessment stack preference; server components would enable streaming responses in a future iteration
- **In-memory storage**: Appropriate for a demo; the README includes a Postgres schema for production
- **No ORMs**: The data model is simple enough that raw queries (or a Map) suffice
- **No vector DB**: See §3; TF-IDF is sufficient and keeps dependencies to zero
