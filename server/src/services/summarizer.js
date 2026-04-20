import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'mixtral-8x7b-32768';

let groq;
if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
} else {
  console.warn(
    'GROQ_API_KEY not found. Summarizer service will be disabled.'
  );
}

function buildPrompt(query, context) {
  const contextString = context
    .map(
      (item) => `
- Type: ${item.type}
- Source: ${item.source}
- Title: ${item.title}
- Year: ${item.year}
- Summary: ${item.summary || item.abstract || 'N/A'}`
    )
    .join('');

  return `You are an expert medical research assistant. Your task is to provide a concise, evidence-based summary based on the provided research context. The user is asking about "${query}".

Analyze the following research data. Use ONLY the information from the provided context. Do not add any external knowledge or hallucinate.

Context:
${contextString}

---

Based strictly on the context above, generate a response in a valid JSON format. Do not include any text or markdown formatting before or after the JSON object. The JSON object must have the following structure:
{
  "overview": "A brief, one-to-two sentence neutral overview of the available research for the query.",
  "key_findings": [
    "A key insight or finding, summarized in one sentence.",
    "Another key insight or finding, summarized in one sentence.",
    "A third key insight or finding, summarized in one sentence."
  ],
  "sources": [
    "Source Title (Year)",
    "Another Source Title (Year)"
  ]
}`;
}

/**
 * @param {string} query The user's search query.
 * @param {Array<object>} context The ranked search results.
 * @returns {Promise<object|null>} A structured summary or null if an error occurs.
 */
export async function summarizeResults(query, context) {
  if (!groq) {
    console.error('Groq client not initialized. Cannot generate summary.');
    return null;
  }

  if (!context || context.length === 0) {
    return null;
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: buildPrompt(query, context)
        }
      ],
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Groq API returned an empty response.');
    }

    const parsed = JSON.parse(content);

    if (parsed && parsed.overview && Array.isArray(parsed.key_findings)) {
      return parsed;
    } else {
      console.error('Groq API response did not match the expected structure.', parsed);
      return null;
    }
  } catch (error) {
    console.error('Error calling Groq API:', error.message);
    return null;
  }
}