import { Router } from 'express';
import { searchPubMed } from '../services/pubmed.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const query = String(req.query.query || '').trim();

    if (!query) {
      return res.status(400).json({
        error: 'A search query is required.'
      });
    }

    const results = await searchPubMed(query);

    return res.json({
      query,
      count: results.length,
      results
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
