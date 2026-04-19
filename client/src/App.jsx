import { useEffect, useRef, useState } from 'react';
import api from './lib/api';

const starterMessages = [
  {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: 'Ask about a condition or therapy and I will pull research papers, clinical trials, and a concise evidence summary.'
  }
];

const followUpTerms = [
  'treatment',
  'treatments',
  'therapy',
  'therapies',
  'drug',
  'drugs',
  'trial',
  'trials',
  'symptoms',
  'causes',
  'risk',
  'diagnosis',
  'latest',
  'papers',
  'research'
];

const fillerWords = new Set([
  'about',
  'and',
  'any',
  'are',
  'best',
  'can',
  'clinical',
  'current',
  'for',
  'give',
  'how',
  'in',
  'is',
  'latest',
  'me',
  'new',
  'of',
  'on',
  'papers',
  'research',
  'show',
  'studies',
  'study',
  'tell',
  'the',
  'therapy',
  'therapies',
  'treatment',
  'treatments',
  'trial',
  'trials',
  'what',
  'with'
]);

function getQueryTokens(value) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function isFollowUpQuery(value) {
  const lowerValue = value.toLowerCase();
  const tokens = getQueryTokens(value);

  return (
    tokens.length <= 6
    || followUpTerms.some((term) => lowerValue.includes(term))
    || /^(what|how|any|show|give|tell)\b/.test(lowerValue)
  );
}

function inferDisease(value) {
  const tokens = getQueryTokens(value)
    .filter((token) => token.length > 2 && !fillerWords.has(token));

  if (!tokens.length) {
    return '';
  }

  return tokens.slice(0, 4).join(' ');
}

function buildEffectiveQuery(value, rememberedDisease) {
  if (!rememberedDisease || !isFollowUpQuery(value)) {
    return value;
  }

  const lowerValue = value.toLowerCase();

  if (lowerValue.includes(rememberedDisease.toLowerCase())) {
    return value;
  }

  return `${rememberedDisease} ${value}`;
}

function ClinicalTrials({ summary, results }) {
  const rankedTrials = results
    .filter((result) => result.type === 'trial')
    .map((trial) => {
      const location = trial.location?.[0] || 'location unavailable';
      const status = trial.status || 'status unavailable';

      return `${trial.title} - ${status}; ${location}`;
    });
  const trials = rankedTrials.length ? rankedTrials : summary?.trials || [];

  if (!trials.length) {
    return <p>No matching trials appeared in the top ranked results.</p>;
  }

  return (
    <ul>
      {trials.map((trial) => (
        <li key={trial}>{trial}</li>
      ))}
    </ul>
  );
}

function ResearchInsights({ summary }) {
  if (!summary.key_findings?.length) {
    return <p>No specific research insights were extracted from the top papers.</p>;
  }

  return (
    <ol className="insight-list">
      {summary.key_findings.map((finding) => (
        <li key={finding}>{finding}</li>
      ))}
    </ol>
  );
}

function SummaryBlock({ summary, results = [] }) {
  if (!summary) {
    return null;
  }

  return (
    <div className="summary-report">
      <section className="summary-section">
        <h3>Condition Overview</h3>
        <p>{summary.overview}</p>
      </section>

      <section className="summary-section">
        <h3>Research Insights</h3>
        <ResearchInsights summary={summary} />
      </section>

      <section className="summary-section">
        <h3>Clinical Trials</h3>
        <ClinicalTrials summary={summary} results={results} />
      </section>

      <section className="summary-section">
        <h3>Sources</h3>
        <ul>
          {summary.sources?.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <article className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="avatar" aria-hidden="true">{isUser ? 'Y' : 'C'}</div>
      <div className="message-body">
        <div className="message-meta">{isUser ? 'You' : 'Curalink'}</div>
        {message.content && <p>{message.content}</p>}
        {message.memoryNote && <p className="memory-note">{message.memoryNote}</p>}
        <SummaryBlock summary={message.summary} results={message.results} />
      </div>
    </article>
  );
}

function LoadingMessage() {
  return (
    <article className="message message-assistant loading-message">
      <div className="avatar" aria-hidden="true">C</div>
      <div className="message-body loading-body">
        <div className="spinner" aria-hidden="true" />
        <div>
          <div className="message-meta">Curalink</div>
          <p>Fetching papers, checking trials, and summarizing the strongest matches...</p>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="avatar avatar-large" aria-hidden="true">C</div>
      <div>
        <div className="message-meta">Curalink</div>
        <p>Start with a condition, then ask follow-ups like latest treatments, trial locations, or risk factors.</p>
      </div>
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState(starterMessages);
  const [query, setQuery] = useState('');
  const [rememberedDisease, setRememberedDisease] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messageListRef = useRef(null);

  useEffect(() => {
    const messageList = messageListRef.current;

    if (!messageList) {
      return;
    }

    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages, isLoading]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery || isLoading) {
      return;
    }

    const effectiveQuery = buildEffectiveQuery(trimmedQuery, rememberedDisease);
    const inferredDisease = inferDisease(trimmedQuery);
    const memoryNote = effectiveQuery !== trimmedQuery
      ? `Using previous disease context: ${rememberedDisease}.`
      : '';
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedQuery,
      memoryNote
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setQuery('');
    setError('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/chat', { query: effectiveQuery });

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Found ${data.results?.length || 0} ranked sources for "${data.query}".`,
          summary: data.summary,
          results: data.results || []
        }
      ]);

      if (effectiveQuery === trimmedQuery && inferredDisease) {
        setRememberedDisease(inferredDisease);
      }
    } catch (requestError) {
      const message = requestError.response?.data?.message
        || requestError.response?.data?.error
        || 'Unable to reach the research API.';

      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Curalink Research Chat</p>
          <h1>Clinical evidence, summarized fast.</h1>
        </div>
        <div className="status-badge">
          <span />
          {rememberedDisease ? `Context: ${rememberedDisease}` : 'Live research'}
        </div>
      </header>

      <section className="chat-panel" aria-label="Chat messages">
        <div className="message-list" ref={messageListRef}>
          {messages.length === 0 && <EmptyState />}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && <LoadingMessage />}
        </div>
      </section>

      <form className="chat-form" onSubmit={handleSubmit}>
        <label htmlFor="query">Research query</label>
        <div className="input-row">
          <input
            id="query"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={isLoading}
            placeholder="Try diabetes, migraine, asthma treatment..."
          />
          <button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? 'Searching' : 'Send'}
          </button>
        </div>
        {isLoading && <p className="loading-hint">Searching medical literature and trials...</p>}
        {error && <p className="error-message">{error}</p>}
      </form>
    </main>
  );
}

export default App;
