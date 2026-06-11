import "./globals.css";

export const metadata = {
  title: "LLM Assessment — Smart Triage & RAG",
  description: "Self-hosted LLM powered support triage and knowledge assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
