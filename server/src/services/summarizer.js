import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

/* ------------------ CONFIG ------------------ */
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = "llama-3.1-8b-instant";

let groq = null;

if (GROQ_API_KEY) {
  groq = new Groq({ apiKey: GROQ_API_KEY });
  console.log("[Summarizer] ✅ Groq initialized");
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

Based ONLY on the research data below:

1. Explain the condition
2. Give key findings (numbered points)
3. Mention clinical trials if any
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
    console.warn("⚠️ No context provided");
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
      temperature: 0.3,
    });

    const content = response.choices?.[0]?.message?.content;

    console.log("🧠 RAW GROQ RESPONSE:\n", content);

    if (!content) {
      console.error("❌ Empty response from Groq");
      return null;
    }

    /* ------------------ SAFE STRUCTURING ------------------ */

    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

    // Overview = first meaningful line
    const overview =
      lines.find(line => line.length > 40) || "No overview available";

    // Key findings = numbered or bullet lines
    const key_findings = lines
      .filter(line =>
        /^[0-9]+\./.test(line) || line.startsWith("-")
      )
      .slice(0, 5);

    // Sources = from context (reliable)
    const sources = context.map(
      (item) => `${item.title} (${item.year || "N/A"})`
    );

    console.log("✅ Structured summary created");

    return {
      overview,
      key_findings,
      sources,
    };

  } catch (error) {
    console.error("❌ GROQ ERROR:", error.message);
    return null;
  }
}