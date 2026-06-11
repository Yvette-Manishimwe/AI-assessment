const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  health: () => request("/api/health"),

  triage: {
    submit: (text) =>
      request("/api/triage", { method: "POST", body: JSON.stringify({ text }) }),
    list: (filters = {}) => {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      );
      return request(`/api/triage?${params}`);
    },
    delete: (id) => request(`/api/triage/${id}`, { method: "DELETE" }),
  },

  rag: {
    ask: (query, history = []) =>
      request("/api/rag/ask", { method: "POST", body: JSON.stringify({ query, history }) }),
    documents: () => request("/api/rag/documents"),
  },
};
