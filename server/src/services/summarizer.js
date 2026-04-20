import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'mixtral-8x7b-32768';

let groq;
if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
} else {
  console.error('[Summarizer Service] GROQ_API_KEY is missing from environment variables.');
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

Based strictly on the context above, generate a response in a valid JSON format. Provide ONLY the JSON object. Do not include any markdown formatting, backticks, or conversational text. The JSON object must strictly match this exact structure:
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
    console.warn('[Summarizer Service] Groq client not initialized. Falling back to default safety summary.');
    return null;
  }

  if (!context || context.length === 0) {
    console.warn('[Summarizer Service] No context provided to summarize.');
    return null;
  }

  try {
    console.log(`[Summarizer Service] Sending request to Groq API for: "${query}"`);

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

    console.log('[Summarizer Service] Received raw content from Groq API.');

    // Robust JSON parsing (handles edge cases where LLMs wrap the output in markdown block)
    const cleanJsonString = content.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(cleanJsonString);

    if (parsed && parsed.overview && Array.isArray(parsed.key_findings)) {
      console.log('[Summarizer Service] Successfully generated and parsed Groq summary.');
      return parsed;
    } else {
      console.error('[Summarizer Service] Groq API response did not match the expected JSON schema.', parsed);
      return null;
    }
  } catch (error) {
    console.error('[Summarizer Service Error]:', error.stack || error);
    if (error.response) {
      console.error('[Groq API Response Payload]:', error.response.data);
    }
    return null;
  }
}