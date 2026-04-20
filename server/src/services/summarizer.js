import axios from "axios";

/* ------------------ LLM ENDPOINT ------------------ */
const LLM_URL = "http://127.0.0.1:8000/llm";;

/* ------------------ PREPARE CONTEXT ------------------ */
function prepareContext(results) {
  return results.slice(0, 10).map((r, i) => ({
    index: i + 1,
    title: r.title,
    summary: r.summary || r.abstract || "",
    source: r.source,
    year: r.year,
    type: r.type,
    status: r.status || null
  }));
}

/* ------------------ FALLBACK SUMMARY ------------------ */
function fallbackSummary(query, results) {
  return {
    overview: `Here are research-backed insights related to "${query}".`,

    key_findings: results.slice(0, 5).map((r, i) =>
      `${i + 1}. ${r.title} — Relevant study related to ${query}.`
    ),

    sources: results
      .filter(r => r.source)
      .map(r => `${r.source} (${r.year || "N/A"})`)
  };
}

/* ------------------ MAIN FUNCTION ------------------ */
export async function summarizeResults(query, results) {
  try {
    const context = prepareContext(results);

    /* ------------------ CALL LLM ------------------ */
    const response = await axios.post(LLM_URL, {
      query,
      context
    });

    const data = response.data;

    /* ------------------ VALIDATION ------------------ */
    if (!data?.summary) {
      return fallbackSummary(query, results);
    }

    return {
      overview:
        data.summary.overview ||
        `Summary for "${query}" based on medical research.`,

      key_findings:
        data.summary.key_findings?.length
          ? data.summary.key_findings
          : fallbackSummary(query, results).key_findings,

      sources:
        data.summary.sources?.length
          ? data.summary.sources
          : fallbackSummary(query, results).sources
    };

  } catch (error) {
    console.error("Summarizer error:", error.message);

    /* ------------------ FALLBACK ------------------ */
    return fallbackSummary(query, results);
  }
}