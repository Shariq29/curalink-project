import { Router } from 'express';
import { searchAndRank } from '../services/rankedSearch.js';
import { summarizeResults } from '../services/summarizer.js';

const router = Router();

/* ------------------ CLEAN RESULT FORMAT ------------------ */
function formatResult(result) {
  return {
    source: result.source || "Unknown",
    type: result.type || "paper",
    title: result.title || "No title",
    year: result.year || null,
    score: result.score || 0,
    status: result.status || null,
    location: result.location || null,
    authors: result.authors?.slice(0, 5) || []
  };
}

/* ------------------ CHAT ROUTE ------------------ */
router.post('/', async (req, res) => {
  try {
    const query = String(req.body.query || req.body.message || '').trim();

    if (!query) {
      return res.status(400).json({
        summary: {
          overview: "No query provided",
          key_findings: [],
          sources: []
        },
        results: []
      });
    }

    /* ------------------ RETRIEVAL ------------------ */
    const rankedResults = await searchAndRank(query);

    /* ------------------ SUMMARIZATION ------------------ */
    const summary = await summarizeResults(query, rankedResults);

    /* ------------------ FALLBACK SAFETY ------------------ */
    const safeSummary = {
      overview:
        summary?.overview ||
        `Here are research-backed insights for "${query}".`,

      key_findings:
        summary?.key_findings?.length
          ? summary.key_findings
          : rankedResults.slice(0, 5).map((r, i) =>
              `${i + 1}. ${r.title} — Relevant research related to ${query}.`
            ),

      sources:
        summary?.sources?.length
          ? summary.sources
          : rankedResults
              .filter(r => r.source)
              .map(r => `${r.source} (${r.year || "N/A"})`)
    };

    /* ------------------ RESPONSE ------------------ */
    return res.json({
      summary: safeSummary,
      results: rankedResults.map(formatResult)
    });

  } catch (error) {
    console.error("Chat route error:", error);

    return res.status(500).json({
      summary: {
        overview: "Something went wrong while fetching research data.",
        key_findings: [],
        sources: []
      },
      results: []
    });
  }
});

export default router;