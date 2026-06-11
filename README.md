# LLM Assessment: Smart Triage + RAG Knowledge Assistant

A full-stack application with two AI-powered use cases, running entirely on a **self-hosted open-source LLM** via Ollama — no external AI APIs used.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│              Next.js 14 Frontend (port 3000)                │
│         Smart Triage Dashboard | RAG Chat UI                │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────────┐
│              Express.js Backend (port 3001)                 │
│  /api/triage     Structured generation + JSON validation    │
│  /api/rag/ask    TF-IDF retrieval + grounded generation     │
│  /api/health     Ollama connectivity check                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (localhost:11434)
┌──────────────────────▼──────────────────────────────────────┐
│                   Ollama (port 11434)                       │
│              Model: llama3.2 (3B, ~2GB RAM)                 │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Ollama & pull a model

```bash
# Install Ollama (macOS)
brew install ollama

# Install Ollama (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model (llama3.2 recommended — ~2GB, runs on free-tier hardware)
ollama pull llama3.2

# Start Ollama
ollama serve
```

Alternatively, use a lighter model on very constrained hardware:
```bash
ollama pull phi3          # 3.8B — good quality, ~2.3GB
ollama pull qwen2.5:3b    # 3B — strong at structured output
```

### 2. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/llm-assessment.git
cd llm-assessment

# Configure backend
cp backend/.env.example backend/.env
# Edit backend/.env if you want a different model or Ollama URL
```

### 3. Install dependencies

```bash
# Install root + all workspaces
npm run install:all

# Or manually:
cd backend && npm install
cd ../frontend && npm install
```

### 4. Run the application

```bash
# From root — starts both frontend and backend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Ollama: http://localhost:11434

---

## Use Case 1: Smart Intake Triage

**Endpoint:** `POST /api/triage`

Accepts unstructured support ticket text, returns validated structured JSON:

```json
{
  "id": "uuid",
  "category": "billing | technical | account | feature_request | complaint | general",
  "priority": "critical | high | medium | low",
  "sentiment": "positive | neutral | negative | frustrated",
  "summary": "1-2 sentence summary",
  "key_fields": [{"field": "order_id", "value": "#4521"}],
  "suggested_reply": "Professional reply draft",
  "confidence": 0.95,
  "parse_fallback": false,
  "created_at": "ISO timestamp"
}
```

**Schema decisions:**
- **Priority levels**: Defined by business impact — `critical` = revenue/data blocked, `high` = core feature broken or churn risk, `medium` = degraded UX with workaround, `low` = cosmetic/feature request
- **Sentiment** tracks customer emotional state separate from issue severity (useful for routing to senior agents)
- **Confidence score**: LLM self-reports classification certainty; low scores flag for human review
- **parse_fallback**: `true` when all JSON extraction attempts failed and a safe default was used

**Malformed output handling (3-tier fallback):**
1. Direct parse → strip markdown fences → extract JSON object block → repair common issues
2. Retry with simplified 1-shot prompt at temperature=0
3. Return safe defaults with `parse_fallback: true` and `confidence: 0.1`

---

## Use Case 2: Grounded Knowledge Assistant (RAG)

**Endpoint:** `POST /api/rag/ask`

**Retrieval strategy:** TF-IDF cosine similarity (zero-dependency, no vector DB required)
- Documents are chunked into ~300 token overlapping windows
- Query and chunks are represented as normalized term-frequency vectors
- Cosine similarity determines relevance ranking

**"Not in knowledge base" threshold:** Cosine similarity < 0.05
- At this threshold, the query shares almost no vocabulary with any document chunk
- The LLM is never called — instead, a canned "not in KB" response is returned
- This eliminates hallucination for out-of-scope questions

**Knowledge base:** 4 documents in `backend/data/knowledge-base/`:
- `product_overview.md` — Features, pricing, system requirements
- `billing_and_account.md` — Billing FAQ, account management
- `technical_troubleshooting.md` — Error codes, login issues, integrations
- `api_documentation.md` — REST API, webhooks, SDKs

To add documents, drop `.md` or `.txt` files in `backend/data/knowledge-base/` and restart the backend.

---

## Model Choice & Rationale

**Model: `llama3.2` (3B parameters)**

| Factor | Decision |
|--------|----------|
| Hardware | Runs on 4GB RAM — compatible with free-tier cloud VMs or a developer laptop |
| Quantization | GGUF Q4_K_M via Ollama — 4-bit, minimal quality loss vs full precision |
| Quality | Strong instruction-following; good at structured JSON output |
| Latency | ~2-5s per request on CPU; ~0.5s on GPU |
| Alternatives | `qwen2.5:3b` (better at JSON), `phi3` (smaller, slightly weaker reasoning) |

---

## API Reference

### Triage

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/triage | Submit and classify a ticket |
| GET | /api/triage | List tickets (filter: ?category=billing&priority=high) |
| GET | /api/triage/:id | Get a single ticket |
| DELETE | /api/triage/:id | Delete a ticket |

### RAG

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/rag/ask | Ask a question (body: {query, history[]}) |
| GET | /api/rag/documents | List knowledge base documents |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Ollama connectivity + model list |

---

## Production Considerations

- **Storage**: Replace in-memory `Map` in `triage.js` with Postgres (schema below)
- **Embeddings**: Replace TF-IDF with `nomic-embed-text` via Ollama + pgvector for semantic retrieval
- **Auth**: Add JWT middleware to Express routes
- **Rate limiting**: Add `express-rate-limit` per IP/user
- **Scaling**: Ollama supports concurrent requests; horizontal scaling needs shared storage

```sql
-- Minimal Postgres schema for triage tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY,
  original_text TEXT NOT NULL,
  category VARCHAR(50),
  priority VARCHAR(20),
  sentiment VARCHAR(20),
  summary TEXT,
  key_fields JSONB,
  suggested_reply TEXT,
  confidence FLOAT,
  parse_fallback BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_tickets_priority ON tickets(priority);
```

---

## Project Structure

```
llm-assessment/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry point
│   │   ├── routes/
│   │   │   ├── triage.js         # Triage CRUD routes
│   │   │   ├── rag.js            # RAG query routes
│   │   │   └── health.js         # Health check
│   │   ├── services/
│   │   │   ├── ollama.js         # Ollama HTTP client
│   │   │   ├── triage.js         # Classification logic + in-memory store
│   │   │   └── rag.js            # TF-IDF retrieval + generation
│   │   └── utils/
│   │       └── jsonExtractor.js  # Multi-tier JSON parse + validation
│   ├── data/knowledge-base/      # Drop .md/.txt files here
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js
│   │   │   ├── page.js           # App shell + navigation
│   │   │   └── globals.css       # Design system
│   │   ├── components/
│   │   │   ├── TriageDashboard.js
│   │   │   ├── RAGChat.js
│   │   │   └── StatusBar.js
│   │   └── lib/api.js            # API client
│   └── next.config.js
├── docs/
│   └── decision-memo.md
└── README.md
```
