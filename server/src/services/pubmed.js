import { XMLParser } from 'fast-xml-parser';

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const RESULT_LIMIT = 50;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  trimValues: true
});

function asArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 10))
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function toText(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return decodeXmlEntities(String(value));
  }

  if (Array.isArray(value)) {
    return value.map(toText).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !['Label', 'NlmCategory'].includes(key))
      .map(([, nestedValue]) => toText(nestedValue))
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

function getYear(pubDate = {}) {
  if (pubDate.Year) {
    return String(pubDate.Year);
  }

  const medlineDate = toText(pubDate.MedlineDate);
  const match = medlineDate.match(/\b(18|19|20)\d{2}\b/);

  return match ? match[0] : '';
}

function getAuthors(authorList = {}) {
  return asArray(authorList.Author)
    .map((author) => {
      if (author.CollectiveName) {
        return toText(author.CollectiveName);
      }

      return [author.ForeName, author.LastName].map(toText).filter(Boolean).join(' ');
    })
    .filter(Boolean);
}

function extractArticle(pubmedArticle) {
  const citation = pubmedArticle.MedlineCitation || {};
  const article = citation.Article || {};
  const pubDate = article.Journal?.JournalIssue?.PubDate || {};

  return {
    title: toText(article.ArticleTitle),
    abstract: toText(article.Abstract?.AbstractText),
    authors: getAuthors(article.AuthorList),
    year: getYear(pubDate)
  };
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PubMed request failed with status ${response.status}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PubMed request failed with status ${response.status}`);
  }

  return response.text();
}

export async function searchPubMed(query) {
  const searchParams = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: String(RESULT_LIMIT),
    retmode: 'json'
  });

  const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi?${searchParams}`;
  const searchData = await fetchJson(searchUrl);
  const ids = searchData.esearchresult?.idlist || [];

  if (ids.length === 0) {
    return [];
  }

  const fetchParams = new URLSearchParams({
    db: 'pubmed',
    id: ids.join(','),
    retmode: 'xml'
  });

  const fetchUrl = `${PUBMED_BASE_URL}/efetch.fcgi?${fetchParams}`;
  const xml = await fetchText(fetchUrl);
  const data = parser.parse(xml);
  const articles = asArray(data.PubmedArticleSet?.PubmedArticle);

  return articles.map(extractArticle);
}
