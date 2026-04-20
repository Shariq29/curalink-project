import { useEffect, useRef, useState } from "react";
import api from "./lib/api";

/* ------------------ INITIAL MESSAGE ------------------ */
const starterMessages = [
  {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "Ask about a condition or therapy. I’ll fetch research papers, clinical trials, and give a structured evidence-based summary."
  }
];

/* ------------------ QUERY HELPERS ------------------ */
const followUpTerms = [
  "treatment",
  "therapy",
  "drug",
  "trial",
  "symptoms",
  "causes",
  "risk",
  "diagnosis",
  "latest",
  "research"
];

const fillerWords = new Set([
  "about", "and", "are", "can", "for", "how", "in", "is",
  "of", "on", "the", "what", "with"
]);

function getTokens(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function inferDisease(text) {
  return getTokens(text)
    .filter(t => t.length > 2 && !fillerWords.has(t))
    .slice(0, 3)
    .join(" ");
}

function isFollowUp(text) {
  const lower = text.toLowerCase();
  return followUpTerms.some(t => lower.includes(t)) || text.length < 40;
}

function buildQuery(text, disease) {
  if (!disease || !isFollowUp(text)) return text;
  if (text.toLowerCase().includes(disease)) return text;
  return `${disease} ${text}`;
}

/* ------------------ UI COMPONENTS ------------------ */

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function Sources({ sources }) {
  if (!sources?.length) return <p>No sources available.</p>;

  return (
    <ul>
      {sources.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  );
}

function Trials({ results }) {
  const trials = results?.filter(r => r.source === "ClinicalTrials") || [];

  if (!trials.length) return <p>No trials found.</p>;

  return (
    <ul>
      {trials.map((t, i) => (
        <li key={i}>{t.title}</li>
      ))}
    </ul>
  );
}

function SummaryBlock({ summary, results }) {
  if (!summary) return null;

  return (
    <div style={styles.card}>
      <Section title="🩺 Condition Overview">
        <p>{summary.overview || "No overview available."}</p>
      </Section>

      <Section title="📚 Research Insights">
        <ul>
          {summary.key_findings?.map((k, i) => (
            <li key={i}>{k}</li>
          )) || <p>No insights found.</p>}
        </ul>
      </Section>

      <Section title="🧪 Clinical Trials">
        <Trials results={results} />
      </Section>

      <Section title="🔗 Sources">
        <Sources sources={summary.sources} />
      </Section>
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div style={{ ...styles.message, ...(isUser ? styles.user : styles.bot) }}>
      <b>{isUser ? "You" : "Curalink"}</b>
      <p>{message.content}</p>
      <SummaryBlock summary={message.summary} results={message.results} />
    </div>
  );
}

/* ------------------ MAIN APP ------------------ */

function App() {
  const [messages, setMessages] = useState(starterMessages);
  const [query, setQuery] = useState("");
  const [disease, setDisease] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ref = useRef(null);

  useEffect(() => {
    ref.current?.scrollTo(0, ref.current.scrollHeight);
  }, [messages, loading]);

  async function send() {
    if (!query.trim() || loading) return;

    const effectiveQuery = buildQuery(query, disease);
    const inferred = inferDisease(query);

    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: query }
    ]);

    setLoading(true);
    setQuery("");

    try {
      const { data } = await api.post("/chat", {
        query: effectiveQuery
      });

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Found ${data.results?.length || 0} sources.`,
          summary: data.summary,
          results: data.results
        }
      ]);

      if (inferred) setDisease(inferred);

    } catch (e) {
      setError("Backend error");
    }

    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <h1>Curalink AI</h1>

      <div ref={ref} style={styles.chat}>
        {messages.map(m => (
          <ChatMessage key={m.id} message={m} />
        ))}

        {loading && <p>🔄 Fetching research...</p>}
      </div>

      <div style={styles.inputRow}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask about disease, treatment, trials..."
          style={styles.input}
        />
        <button onClick={send} style={styles.button}>
          Send
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

/* ------------------ STYLES ------------------ */

const styles = {
  container: { padding: 20, fontFamily: "Arial" },
  chat: {
    height: 400,
    overflowY: "auto",
    border: "1px solid #ddd",
    padding: 10,
    marginBottom: 10
  },
  message: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 8
  },
  user: { background: "#e3f2fd" },
  bot: { background: "#f5f5f5" },
  inputRow: { display: "flex", gap: 10 },
  input: { flex: 1, padding: 10 },
  button: { padding: 10 },
  card: { marginTop: 10, padding: 10, background: "#fff" },
  section: { marginBottom: 10 },
  sectionTitle: { marginBottom: 5 }
};

export default App;