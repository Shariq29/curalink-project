import { Router } from "express";
import { searchAndRank } from "../services/rankedSearch.js";
import { summarizeResults } from "../services/summarizer.js";

const router = Router();

/* ------------------ FALLBACK ------------------ */
function fallbackSummary(query, results) {
  return {
    overview: `Here are research-backed insights for "${query}".`,
    key_findings: results.slice(0, 5).map(
      (r, i) => `${i + 1}. ${r.title} — Relevant research related to ${query}.`
    ),
    sources: results.map(
      (r) => `${r.source} (${r.year || "N/A"})`
    ),
  };
}

/* ------------------ ROUTE ------------------ */
router.post("/", async (req, res) => {
  try {
    const query = String(req.body.query || "").trim();

    console.log("📥 Incoming query:", query);

    if (!query) {
      return res.status(400).json({
        summary: fallbackSummary("empty", []),
        results: [],
      });
    }

    /* ---------- STEP 1: FETCH ---------- */
    const rankedResults = await searchAndRank(query);

    console.log("📊 Results fetched:", rankedResults.length);

    /* ---------- STEP 2: AI SUMMARY ---------- */
    const summary = await summarizeResults(query, rankedResults);

    /* ---------- STEP 3: RESPONSE ---------- */
    if (!summary) {
      console.warn("⚠️ Using fallback summary");

      return res.json({
        summary: fallbackSummary(query, rankedResults),
        results: rankedResults,
      });
    }

    console.log("✅ Using AI summary");

    return res.json({
      summary,
      results: rankedResults,
    });

  } catch (error) {
    console.error("❌ CHAT ERROR:", error);

    return res.status(500).json({
      summary: {
        overview: "Server error occurred",
        key_findings: [],
        sources: [],
      },
      results: [],
    });
  }
});

export default router;