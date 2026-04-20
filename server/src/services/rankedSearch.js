import { searchClinicalTrials } from './clinicalTrials.js';
import { searchPubMed } from './pubmed.js';

const TOP_RESULT_LIMIT = 10;
const CURRENT_YEAR = new Date().getFullYear();

/* ------------------ TOKENIZATION ------------------ */
function tokenize(query) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

/* ------------------ MATCH SCORING ------------------ */
function countMatches(text, tokens) {
  const normalized = String(text || '').toLowerCase();

  return tokens.reduce((count, token) => {
    return normalized.includes(token) ? count + 1 : count;
  }, 0);
}

/* ------------------ RECENCY ------------------ */
function getRecencyScore(year) {
  const y = Number.parseInt(year, 10);

  if (!Number.isInteger(y)) return 0;

  const age = CURRENT_YEAR - y;

  return Math.max(0, 20 - age); // recent = higher
}

/* ------------------ SOURCE WEIGHT ------------------ */
function getSourceWeight(source) {
  switch (source) {
    case 'PubMed':
      return 5;
    case 'ClinicalTrials':
      return 6; // slightly higher (real-world data)
    default:
      return 2;
  }
}

/* ------------------ TRIAL BONUS ------------------ */
function getTrialBonus(item) {
  if (item.type !== 'trial') return 0;

  let bonus = 0;

  if (item.status?.toLowerCase().includes('recruiting')) {
    bonus += 5;
  }

  return bonus;
}

/* ------------------ FINAL SCORING ------------------ */
function rankItem(item, tokens) {
  const titleMatches = countMatches(item.title, tokens);
  const bodyMatches = countMatches(item.summary || item.abstract, tokens);

  const relevanceScore = titleMatches * 10 + bodyMatches * 4;
  const recencyScore = getRecencyScore(item.year);
  const sourceWeight = getSourceWeight(item.source);
  const trialBonus = getTrialBonus(item);

  const finalScore =
    relevanceScore +
    recencyScore +
    sourceWeight +
    trialBonus +
    (item.score || 0); // include upstream score

  return {
    ...item,
    score: finalScore,
    relevanceScore,
    recencyScore,
    sourceWeight,
    trialBonus
  };
}

/* ------------------ NORMALIZATION ------------------ */
function normalizePubMed(article) {
  return {
    source: 'PubMed',
    type: 'paper',
    title: article.title,
    summary: article.abstract,
    abstract: article.abstract,
    authors: article.authors,
    year: article.year,
    score: article.score || 0
  };
}

function normalizeClinicalTrial(trial) {
  return {
    source: 'ClinicalTrials',
    type: 'trial',
    title: trial.title,
    summary: [trial.status, ...(trial.location || [])].join(' '),
    status: trial.status,
    location: trial.location,
    year: trial.year,
    score: trial.score || 0
  };
}

/* ------------------ MAIN PIPELINE ------------------ */
export async function searchAndRank(query) {
  try {
    const tokens = tokenize(query);

    const [articles, trials] = await Promise.all([
      searchPubMed(query),
      searchClinicalTrials(query)
    ]);

    const combined = [
      ...articles.map(normalizePubMed),
      ...trials.map(normalizeClinicalTrial)
    ];

    const ranked = combined
      .map(item => rankItem(item, tokens))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.year || 0) - (a.year || 0);
      });

    return ranked.slice(0, TOP_RESULT_LIMIT);

  } catch (error) {
    console.error("Ranking error:", error.message);
    return [];
  }
}