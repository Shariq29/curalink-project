const SUMMARIZER_URL = process.env.SUMMARIZER_URL || 'http://localhost:8000/llm';
const SUMMARIZER_TIMEOUT_MS = Number(process.env.SUMMARIZER_TIMEOUT_MS || 15000);

export async function summarizeResults(query, context) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUMMARIZER_TIMEOUT_MS);

  try {
    const response = await fetch(SUMMARIZER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, context }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Summarizer returned status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
