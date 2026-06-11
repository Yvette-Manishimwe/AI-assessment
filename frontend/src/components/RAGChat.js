"use client";
import { useState, useEffect, useRef } from "react";
import { Send, BookOpen, AlertCircle, ExternalLink, ChevronDown, ChevronUp, Sparkles, Bot, User } from "lucide-react";
import { api } from "../lib/api";

const STARTER_QUESTIONS = [
  "How do I cancel my subscription?",
  "What pricing plans are available?",
  "How does the GitHub integration work?",
  "What are the API rate limits?",
  "What happens if my payment fails?",
  "How do I fix error code E1001?",
];

function Message({ msg }) {
  const [showChunks, setShowChunks] = useState(false);
  const isUser = msg.role === "user";

  return (
    <div
      className="animate-fade-in"
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: 10,
        marginBottom: 20,
        alignItems: "flex-start",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: isUser ? "var(--accent-dim)" : "var(--blue-dim)",
          border: `1px solid ${isUser ? "var(--accent)" : "var(--blue)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isUser ? <User size={14} color="var(--accent)" /> : <Bot size={14} color="var(--blue)" />}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: "80%", minWidth: 100 }}>
        {isUser ? (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--bg-3)",
              border: "1px solid var(--border)",
              borderRadius: "12px 4px 12px 12px",
              fontSize: 13,
              color: "var(--text)",
              lineHeight: 1.6,
            }}
          >
            {msg.content}
          </div>
        ) : (
          <div>
            <div
              style={{
                padding: "12px 16px",
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                borderRadius: "4px 12px 12px 12px",
              }}
            >
              {/* Not in KB warning */}
              {msg.in_kb === false && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(251, 146, 60, 0.08)", border: "1px solid rgba(251, 146, 60, 0.3)", borderRadius: 7, marginBottom: 10, fontSize: 11, color: "#fb923c", fontFamily: "var(--font-mono)" }}>
                  <AlertCircle size={11} />
                  Not found in knowledge base
                </div>
              )}

              {/* Answer text */}
              <p className="answer-prose" style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
                {msg.content}
              </p>

              {/* Citations */}
              {msg.citations?.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Sources
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {msg.citations.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
                          background: "var(--blue-dim)", border: "1px solid rgba(59, 130, 246, 0.3)",
                          borderRadius: 20, fontSize: 11, color: "var(--blue)", fontFamily: "var(--font-mono)",
                        }}
                      >
                        <BookOpen size={10} />
                        {c.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Retrieved chunks toggle */}
              {msg.retrieved_chunks?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => setShowChunks(!showChunks)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
                      cursor: "pointer", color: "var(--text-3)", fontSize: 10, fontFamily: "var(--font-mono)",
                      padding: 0, textTransform: "uppercase", letterSpacing: "0.05em",
                    }}
                  >
                    {showChunks ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    {showChunks ? "Hide" : "Show"} retrieval ({msg.retrieved_chunks.length} chunks, top score: {msg.retrieved_chunks[0]?.score})
                  </button>
                  {showChunks && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {msg.retrieved_chunks.map((chunk, i) => (
                        <div key={i} style={{ padding: "7px 10px", background: "var(--bg-3)", borderRadius: 7, border: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: "var(--blue)", fontFamily: "var(--font-mono)" }}>{chunk.title}</span>
                            <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>score: {chunk.score}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>{chunk.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RAGChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [showDocs, setShowDocs] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.rag.documents().then((d) => setDocuments(d.documents)).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (query) => {
    const q = query || input.trim();
    if (!q || loading) return;

    const userMsg = { role: "user", content: q };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await api.rag.ask(q, history);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: result.answer,
          citations: result.citations,
          retrieved_chunks: result.retrieved_chunks,
          in_kb: result.in_kb,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${e.message}`, in_kb: null, citations: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, height: "calc(100vh - 120px)", alignItems: "start" }}>
      {/* Chat area */}
      <div className="glass" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={14} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Knowledge Assistant</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginLeft: 4 }}>
            grounded · cited · honest
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 40 }}>
              <div style={{ width: 48, height: 48, background: "var(--blue-dim)", border: "1px solid var(--blue)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <BookOpen size={22} color="var(--blue)" />
              </div>
              <p style={{ fontSize: 15, fontFamily: "var(--font-display)", color: "var(--text)", marginBottom: 6 }}>
                Ask me anything about the product
              </p>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 24 }}>
                Answers are grounded in the knowledge base with citations.<br />
                I'll tell you when I don't know.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    style={{
                      padding: "6px 12px", background: "var(--bg-3)", border: "1px solid var(--border)",
                      borderRadius: 20, cursor: "pointer", color: "var(--text-2)", fontSize: 12,
                      fontFamily: "var(--font-body)", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.target.style.borderColor = "var(--blue)"; e.target.style.color = "var(--text)"; }}
                    onMouseLeave={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.color = "var(--text-2)"; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => <Message key={i} msg={msg} />)}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--blue-dim)", border: "1px solid var(--blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={14} color="var(--blue)" />
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "8px 12px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "4px 12px 12px 12px" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--blue)", animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask a question about the product..."
              disabled={loading}
              style={{
                flex: 1, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8,
                padding: "9px 14px", color: "var(--text)", fontSize: 13, fontFamily: "var(--font-body)",
                outline: "none", transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--blue)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                padding: "9px 16px", background: input.trim() ? "var(--blue)" : "var(--bg-3)",
                border: "none", borderRadius: 8, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                color: input.trim() ? "#fff" : "var(--text-3)", opacity: !input.trim() ? 0.5 : 1,
                transition: "all 0.15s", display: "flex", alignItems: "center",
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Right panel: knowledge base docs */}
      <div>
        <div className="glass" style={{ padding: 16 }}>
          <button
            onClick={() => setShowDocs(!showDocs)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--text)", padding: 0, marginBottom: showDocs ? 12 : 0 }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
              <BookOpen size={14} color="var(--accent)" />
              Knowledge Base
            </span>
            <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              {documents.length} docs {showDocs ? <ChevronUp size={11} style={{ display: "inline" }} /> : <ChevronDown size={11} style={{ display: "inline" }} />}
            </span>
          </button>

          {showDocs && documents.map((doc) => (
            <div key={doc.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{doc.title}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>{doc.preview}</p>
              <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{doc.chunks} chunks</span>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="glass" style={{ padding: 16, marginTop: 12 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            How it works
          </p>
          {[
            ["Retrieval", "TF-IDF cosine similarity over document chunks"],
            ["Threshold", "Score < 0.05 → 'not in KB' (no hallucination)"],
            ["Grounding", "Model instructed to cite [Doc: Title] inline"],
            ["Context", "Top 4 chunks injected into prompt"],
          ].map(([title, desc]) => (
            <div key={title} style={{ marginBottom: 8 }}>
              <p style={{ margin: "0 0 1px", fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{title}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
