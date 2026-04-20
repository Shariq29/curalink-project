import { XMLParser } from 'fast-xml-parser';

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const RESULT_LIMIT = 50;

/* ------------------ XML PARSER ------------------ */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  trimValues: true
});

/* ------------------ HELPERS ------------------ */
function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(parseInt(code, 10))
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function toText(value) {
  if (!value) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return decodeXmlEntities(String(value));
  }

  if (Array.isArray(value)) {
    return value.map(toText).join(' ');
  }

  if (typeof value === 'object') {
    return Object.values(value).map(toText).join(' ');
  }

  return '';
}

function getYear(pubDate = {}) {
  if (pubDate.Year) return Number(pubDate.Year);

  const text = toText(pubDate.MedlineDate);
  const match = text.match(/\b(18|19|20)\d{2}\b/);

  return match ? Number(match[0]) : null;
}

function getAuthors(authorList = {}) {
  return asArray(authorList.Author)
    .map((author) => {
      if (author.CollectiveName) {
        return toText(author.CollectiveName);
      }

      return [author.ForeName, author.LastName]
        .map(toText)
        .filter(Boolean)
        .join(' ');
    })
    .filter(Boolean);
}

/* ------------------ SCORING ------------------ */
function computeScore(article, query) {
  let score = 0;

  const text = (article.title + " " + article.abstract).toLowerCase();

  // Keyword relevance
  query.toLowerCase().split(" ").forEach(word => {
    if (text.includes(word)) score += 2;
  });

  // Recency boost
  if (article.year) {
    score += (article.year - 2000) * 0.1;
  }

  return score;
}

/* ------------------ EXTRACT ------------------ */
function extractArticle(pubmedArticle, query) {
  const citation = pubmedArticle.MedlineCitation || {};
  const article = citation.Article || {};
  const pubDate = article.Journal?.JournalIssue?.PubDate || {};

  const extracted = {
    type: "paper",
    source: "PubMed",
    title: toText(article.ArticleTitle) || "No title",
    abstract: toText(article.Abstract?.AbstractText),
    authors: getAuthors(article.AuthorList),
    year: getYear(pubDate)
  };

  extracted.score = computeScore(extracted, query);

  return extracted;
}

/* ------------------ FETCH ------------------ */
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed JSON failed: ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed XML failed: ${res.status}`);
  return res.text();
}

/* ------------------ MAIN FUNCTION ------------------ */
export async function searchPubMed(query) {
  try {
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmax: String(RESULT_LIMIT),
      retmode: 'json'
    });

    const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi?${searchParams}`;
    const searchData = await fetchJson(searchUrl);

    const ids = searchData.esearchresult?.idlist || [];

    if (!ids.length) return [];

    const fetchParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'xml'
    });

    const fetchUrl = `${PUBMED_BASE_URL}/efetch.fcgi?${fetchParams}`;
    const xml = await fetchText(fetchUrl);

    const data = parser.parse(xml);
    const articles = asArray(data.PubmedArticleSet?.PubmedArticle);

    let results = articles.map(article =>
      extractArticle(article, query)
    );

    /* ------------------ SORT BY SCORE ------------------ */
    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    /* ------------------ LIMIT ------------------ */
    return results.slice(0, 15);

  } catch (error) {
    console.error("PubMed service error:", error.message);
    return [];
  }
}