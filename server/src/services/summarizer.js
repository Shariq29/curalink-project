import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = "llama-3.1-8b-instant";

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
- ${item.title} (${item.year}) [${item.source}]
${item.summary || item.abstract || "No summary"}`
    )
    .join("\n");

  return `
You are a medical research assistant.

User asked: "${query}"

Based ONLY on the data below, explain clearly:

1. What is the condition
2. Key research insights
3. Any clinical trials
4. Mention sources

Keep answer structured and clear.

DATA:
${contextString}
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

    return {
      overview: content.slice(0, 300),
      key_findings: content
        .split("\n")
        .filter(line => line.trim().length > 20)
        .slice(0, 5),
      sources: context.map(c => `${c.source} (${c.year || "N/A"})`)
    };

  } catch (error) {
    console.error("❌ GROQ ERROR:", error.message);
    return null;
  }
}