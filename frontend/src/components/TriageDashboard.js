"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Send, RefreshCw, Filter, Trash2, AlertTriangle, ChevronDown, ChevronUp,
  Copy, CheckCheck, AlertCircle, TrendingUp, MessageSquare, Tag,
} from "lucide-react";
import { api } from "../lib/api";

const EXAMPLES = [
  "I've been charged twice for my subscription this month. Order #4521. Please issue a refund ASAP.",
  "The dashboard crashes every time I try to open a project after the v2.4 update. Running Chrome 124 on Windows 11. This is blocking my whole team!",
  "Would be great if you could add dark mode to the mobile app. Using it at night strains my eyes.",
  "Can't log in — getting error E1001. Tried resetting password but the reset email never arrives. My account email is user@example.com.",
  "Your competitor just launched a similar product for half the price. You need to do better.",
];

function Badge({ value, type, size = "sm" }) {
  const cls = `${type}-${value?.toLowerCase()?.replace(/\s+/g, "_")}`;
  return (
    <span
      className={cls}
      style={{
        padding: size === "sm" ? "2px 8px" : "4px 12px",
        borderRadius: 20,
        fontSize: size === "sm" ? 11 : 12,
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        display: "inline-block",
      }}
    >
      {value}
    </span>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct > 80 ? "var(--green)" : pct > 50 ? "var(--accent)" : "var(--red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "var(--bg-4)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 30 }}>
        {pct}%
      </span>
    </div>
  );
}

function TicketCard({ ticket, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyReply = () => {
    navigator.clipboard.writeText(ticket.suggested_reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="glass animate-fade-in"
      style={{ marginBottom: 12, overflow: "hidden" }}
    >
      <div style={{ padding: "14px 16px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <Badge value={ticket.priority} type="priority" />
              <Badge value={ticket.category} type="category" />
              {ticket.parse_fallback && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                  <AlertTriangle size={10} /> fallback parse
                </span>
              )}
              <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: "auto" }}>
                {new Date(ticket.created_at).toLocaleTimeString()}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
              {ticket.summary}
            </p>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ padding: "4px 8px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-2)", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "Less" : "More"}
            </button>
            <button
              onClick={() => onDelete(ticket.id)}
              style={{ padding: "4px 6px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-3)" }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Confidence */}
        <ConfidenceBar value={ticket.confidence} />
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px" }}>
          {/* Original text */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Original Ticket
            </p>
            <p style={{ fontSize: 12, color: "var(--text-2)", background: "var(--bg-3)", padding: "10px 12px", borderRadius: 8, margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>
              "{ticket.original_text}"
            </p>
          </div>

          {/* Key fields */}
          {ticket.key_fields?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Extracted Fields
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ticket.key_fields.map((kf, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px" }}>
                    <Tag size={10} color="var(--text-3)" />
                    <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{kf.field}:</span>
                    <span style={{ fontSize: 11, color: "var(--text)" }}>{kf.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Sentiment
            </p>
            <span className={`sentiment-${ticket.sentiment}`} style={{ fontSize: 13, fontWeight: 500 }}>
              {ticket.sentiment}
            </span>
          </div>

          {/* Suggested reply */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                Suggested Reply
              </p>
              <button
                onClick={copyReply}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: copied ? "var(--green-dim)" : "var(--bg-3)", border: `1px solid ${copied ? "var(--green)" : "var(--border)"}`, borderRadius: 5, cursor: "pointer", fontSize: 11, color: copied ? "var(--green)" : "var(--text-2)", fontFamily: "var(--font-mono)" }}
              >
                {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-2)", background: "var(--bg-3)", padding: "10px 12px", borderRadius: 8, margin: 0, lineHeight: 1.7, borderLeft: "3px solid var(--accent)" }}>
              {ticket.suggested_reply}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TriageDashboard() {
  const [tickets, setTickets] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ category: "", priority: "", sentiment: "" });

  const fetchTickets = useCallback(async () => {
    try {
      const data = await api.triage.list(filters);
      setTickets(data.tickets);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingTickets(false);
    }
  }, [filters]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.triage.submit(text);
      setText("");
      await fetchTickets();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await api.triage.delete(id);
    setTickets((t) => t.filter((tk) => tk.id !== id));
  };

  const stats = {
    total: tickets.length,
    critical: tickets.filter((t) => t.priority === "critical").length,
    high: tickets.filter((t) => t.priority === "high").length,
    fallback: tickets.filter((t) => t.parse_fallback).length,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
      {/* Left: Ticket list */}
      <div>
        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total", value: stats.total, color: "var(--text)" },
            { label: "Critical", value: stats.critical, color: "var(--red)" },
            { label: "High", value: stats.high, color: "#fb923c" },
            { label: "Fallback parses", value: stats.fallback, color: "var(--text-3)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass" style={{ flex: 1, padding: "12px 16px" }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>{label}</p>
              <p style={{ margin: 0, fontSize: 22, fontFamily: "var(--font-display)", color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <Filter size={14} color="var(--text-3)" />
          {[
            { key: "category", options: ["", "billing", "technical", "account", "feature_request", "complaint", "general"] },
            { key: "priority", options: ["", "critical", "high", "medium", "low"] },
            { key: "sentiment", options: ["", "positive", "neutral", "negative", "frustrated"] },
          ].map(({ key, options }) => (
            <select
              key={key}
              value={filters[key]}
              onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
              style={{
                background: "var(--bg-2)", border: "1px solid var(--border)", color: filters[key] ? "var(--text)" : "var(--text-3)",
                padding: "5px 10px", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-body)", cursor: "pointer",
              }}
            >
              <option value="">{key.charAt(0).toUpperCase() + key.slice(1)}: All</option>
              {options.filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <button onClick={fetchTickets} style={{ padding: "5px 8px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", color: "var(--text-3)", marginLeft: "auto" }}>
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--red-dim)", border: "1px solid var(--red)", borderRadius: 8, marginBottom: 12, color: "var(--red)", fontSize: 13 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Tickets */}
        {loadingTickets ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 90 }} />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass" style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
            <TrendingUp size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No tickets yet. Submit one on the right →</p>
          </div>
        ) : (
          tickets.map((t) => <TicketCard key={t.id} ticket={t} onDelete={handleDelete} />)
        )}
      </div>

      {/* Right: Input panel */}
      <div style={{ position: "sticky", top: 72 }}>
        <div className="glass" style={{ padding: 20 }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
            <MessageSquare size={14} color="var(--accent)" />
            Submit Support Ticket
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a support ticket or customer feedback here..."
            style={{
              width: "100%", minHeight: 140, background: "var(--bg-3)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "10px 12px", color: "var(--text)", fontSize: 13,
              fontFamily: "var(--font-body)", resize: "vertical", lineHeight: 1.6,
              outline: "none", transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleSubmit(); }}
          />

          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            style={{
              width: "100%", marginTop: 10, padding: "10px 0", background: loading ? "var(--bg-4)" : "var(--accent)",
              border: "none", borderRadius: 8, cursor: loading || !text.trim() ? "not-allowed" : "pointer",
              color: loading ? "var(--text-3)" : "#0d0f14", fontWeight: 600, fontSize: 13,
              fontFamily: "var(--font-body)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: !text.trim() ? 0.5 : 1, transition: "all 0.15s",
            }}
          >
            {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderTopColor: "var(--text-3)" }} /> Classifying...</> : <><Send size={13} /> Triage Ticket <span style={{ fontSize: 10, opacity: 0.6 }}>⌘↵</span></>}
          </button>
        </div>

        {/* Examples */}
        <div className="glass" style={{ padding: 16, marginTop: 12 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Try an example
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => setText(ex)}
                style={{
                  textAlign: "left", padding: "7px 10px", background: "var(--bg-3)", border: "1px solid var(--border)",
                  borderRadius: 7, cursor: "pointer", color: "var(--text-2)", fontSize: 11, lineHeight: 1.5,
                  fontFamily: "var(--font-body)", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.color = "var(--text)"; }}
                onMouseLeave={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.color = "var(--text-2)"; }}
              >
                {ex.slice(0, 80)}...
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
