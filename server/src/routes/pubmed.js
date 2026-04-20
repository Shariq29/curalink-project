import { Router } from 'express';
import { searchPubMed } from '../services/pubmed.js';

const router = Router();

/* ------------------ FORMATTER ------------------ */
function formatPaper(paper) {
  return {
    id: paper.id || null,
    title: paper.title || "No title available",
    authors: paper.authors?.slice(0, 5) || [],
    journal: paper.journal || "Unknown journal",
    date: paper.date || null,
    year: paper.year || (paper.date ? new Date(paper.date).getFullYear() : null),
    link: paper.link || null,
    source: "PubMed"
  };
}

/* ------------------ ROUTE ------------------ */
router.get('/', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();

    if (!query) {
      return res.status(400).json({
        error: 'A search query is required.',
        results: []
      });
    }

    /* ------------------ FETCH DATA ------------------ */
    const results = await searchPubMed(query);

    /* ------------------ SAFETY ------------------ */
    if (!Array.isArray(results)) {
      return res.json({
        query,
        count: 0,
        results: []
      });
    }

    /* ------------------ FORMAT ------------------ */
    const formatted = results.map(formatPaper);

    /* ------------------ RESPONSE ------------------ */
    return res.json({
      query,
      count: formatted.length,
      results: formatted
    });

  } catch (error) {
    console.error("PubMed route error:", error);

    return res.status(500).json({
      error: 'Failed to fetch PubMed data.',
      results: []
    });
  }
});

export default router;