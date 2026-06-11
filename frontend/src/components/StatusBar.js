"use client";
import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function StatusBar() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await api.health();
        setStatus(data);
      } catch {
        setStatus({ status: "error", ollama: { ok: false } });
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const ok = status?.ollama?.ok;
  const loading = status === null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: "var(--bg-3)",
        borderRadius: 20,
        border: "1px solid var(--border)",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        color: loading ? "var(--text-3)" : ok ? "var(--green)" : "var(--red)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: loading ? "var(--text-3)" : ok ? "var(--green)" : "var(--red)",
          animation: ok ? "pulse-dot 2s ease-in-out infinite" : "none",
        }}
      />
      {loading ? "checking..." : ok ? `Ollama · ${status?.ollama?.models?.[0] || "ready"}` : "Ollama offline"}
    </div>
  );
}
