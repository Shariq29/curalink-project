import { fetchPubMed } from './pubmed.js';
import { fetchTrials } from './clinicalTrials.js';

export async function searchAndRank(query) {
  try {
    console.log(`[Search Pipeline] Starting retrieval for: "${query}"`);
    
    const [papers, trials] = await Promise.all([
      fetchPubMed(query),
      fetchTrials(query)
    ]);

    const combined = [...papers, ...trials].filter(item => item && item.title);

    console.log(`[Search Pipeline] Retrieved ${papers.length} papers and ${trials.length} trials.`);

    // Rank by year descending
    const ranked = combined.sort((a, b) => (b.year || 0) - (a.year || 0));
    return ranked.slice(0, 10);
  } catch (error) {
    console.error("[Ranking Pipeline Error]:", error.stack || error);
    return [];
  }
}