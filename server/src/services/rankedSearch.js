import { searchClinicalTrials } from './clinicalTrials.js';
import { searchPubMed } from './pubmed.js';

const TOP_RESULT_LIMIT = 10;
const CURRENT_YEAR = new Date().getFullYear();

function tokenize(query) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

function countMatches(text, tokens) {
  const normalizedText = String(text || '').toLowerCase();

  return tokens.reduce((count, token) => {
    return normalizedText.includes(token) ? count + 1 : count;
  }, 0);
}

function getRecencyScore(year) {
  const parsedYear = Number.parseInt(year, 10);

  if (!Number.isInteger(parsedYear)) {
    return 0;
  }

  const age = Math.max(0, CURRENT_YEAR - parsedYear);

  return Math.max(0, 20 - age);
}

function rankItem(item, queryTokens) {
  const titleMatches = countMatches(item.title, queryTokens);
  const bodyMatches = countMatches(item.summary, queryTokens);
  const relevanceScore = titleMatches * 10 + bodyMatches * 3;
  const recencyScore = getRecencyScore(item.year);

  return {
    ...item,
    score: relevanceScore + recencyScore,
    relevanceScore,
    recencyScore
  };
}

function normalizePubMed(article) {
  return {
    source: 'pubmed',
    type: 'article',
    title: article.title,
    summary: article.abstract,
    abstract: article.abstract,
    authors: article.authors,
    year: article.year
  };
}

function normalizeClinicalTrial(trial) {
  return {
    source: 'clinical_trials',
    type: 'trial',
    title: trial.title,
    summary: [trial.status, ...trial.location].filter(Boolean).join(' '),
    status: trial.status,
    location: trial.location,
    year: trial.year
  };
}

export async function searchAndRank(query) {
  const queryTokens = tokenize(query);
  const [articles, trials] = await Promise.all([
    searchPubMed(query),
    searchClinicalTrials(query)
  ]);

  return [
    ...articles.map(normalizePubMed),
    ...trials.map(normalizeClinicalTrial)
  ]
    .map((item) => rankItem(item, queryTokens))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return Number(second.year || 0) - Number(first.year || 0);
    })
    .slice(0, TOP_RESULT_LIMIT);
}
