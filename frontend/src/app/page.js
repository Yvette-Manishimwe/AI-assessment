"use client";
import { useState, useEffect } from "react";
import { Zap, MessageSquare, Activity, Github } from "lucide-react";
import TriageDashboard from "../components/TriageDashboard";
import RAGChat from "../components/RAGChat";
import StatusBar from "../components/StatusBar";

export default function Home() {
  const [tab, setTab] = useState("triage");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: "var(--accent)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={15} color="#0d0f14" strokeWidth={2.5} />
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                color: "var(--text)",
                letterSpacing: "-0.02em",
              }}
            >
              TriageAI
            </span>
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--accent)",
                background: "var(--accent-dim)",
                padding: "1px 6px",
                borderRadius: 4,
                marginLeft: 2,
              }}
            >
              self-hosted
            </span>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", gap: 4, flex: 1 }}>
            {[
              { id: "triage", label: "Smart Triage", icon: Activity },
              { id: "rag", label: "Knowledge Assistant", icon: MessageSquare },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "var(--font-body)",
                  transition: "all 0.15s",
                  background: tab === id ? "var(--bg-3)" : "transparent",
                  color: tab === id ? "var(--text)" : "var(--text-2)",
                  borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
                  borderRadius: 0,
                  paddingBottom: 4,
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>

          {/* Right */}
          <StatusBar />
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-3)", display: "flex", alignItems: "center" }}
          >
            <Github size={16} />
          </a>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "24px 24px" }}>
        {tab === "triage" ? <TriageDashboard /> : <RAGChat />}
      </main>
    </div>
  );
}
