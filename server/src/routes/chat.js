import { Router } from 'express';
import { searchAndRank } from '../services/rankedSearch.js';
import { summarizeResults } from '../services/summarizer.js';

const router = Router();

function compactResult(result) {
  return {
    source: result.source,
    type: result.type,
    title: result.title,
    year: result.year,
    score: result.score,
    status: result.status,
    location: result.location,
    authors: result.authors?.slice(0, 5)
  };
}

router.post('/', async (req, res, next) => {
  try {
    const query = String(req.body.query || req.body.message || '').trim();

    if (!query) {
      return res.status(400).json({
        error: 'A query is required.'
      });
    }

    const rankedResults = await searchAndRank(query);
    const summary = await summarizeResults(query, rankedResults);

    return res.json({
      query,
      summary,
      results: rankedResults.map(compactResult)
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
