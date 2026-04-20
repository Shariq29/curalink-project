import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = "mixtral-8x7b-32768";

let groq = null;

if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
  console.log("[Summarizer] Groq initialized");
} else {
  console.error("[Summarizer] ❌ GROQ_API_KEY missing");
}

/* ------------------ PROMPT ------------------ */
function buildPrompt(query, context) {
  const contextString = context
    .map(
      (item) => `
- Title: ${item.title}
- Source: ${item.source}
- Year: ${item.year}
- Summary: ${item.summary || item.abstract || "N/A"}`
    )
    .join("\n");

  return `
You are a medical research assistant.

User Query: ${query}

Use ONLY the data below.

${contextString}

Return STRICT JSON:
{
  "overview": "...",
  "key_findings": ["...", "..."],
  "sources": ["..."]
}

NO text outside JSON.
`;
}

/* ------------------ MAIN FUNCTION ------------------ */
export async function summarizeResults(query, context) {
  console.log("===== SUMMARIZER START =====");

  if (!groq) {
    console.error("❌ Groq not initialized");
    return null;
  }

  if (!context || context.length === 0) {
    console.warn("⚠️ No context");
    return null;
  }

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: buildPrompt(query, context),
        },
      ],
      temperature: 0.2,
    });

    const content = response.choices?.[0]?.message?.content;

    console.log("🧠 RAW GROQ:", content);

    if (!content) return null;

    // CLEAN RESPONSE
    const clean = content
      .replace(/```json/gi, "")
      .replace(/```/gi, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(clean);
    } catch (err) {
      console.error("❌ JSON parse failed:", err);
      return null;
    }

    if (!parsed.overview) return null;

    console.log("✅ GROQ SUCCESS");

    return parsed;

  } catch (error) {
    console.error("❌ GROQ ERROR:", error.message);
    return null;
  }
}