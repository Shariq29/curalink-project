import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Health route
app.get('/', (req, res) => {
  res.send("Server is running 🚀");
});

// 🔥 PubMed fetch function
async function fetchPubMed(query) {
  try {
    // Step 1: search IDs
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmode=json&retmax=5`
    );
    const searchData = await searchRes.json();

    const ids = searchData.esearchresult.idlist;

    if (!ids.length) return [];

    // Step 2: fetch details
    const fetchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
    );
    const fetchData = await fetchRes.json();

    const results = ids.map(id => {
      const item = fetchData.result[id];
      return {
        title: item.title,
        authors: item.authors?.map(a => a.name).join(", "),
        journal: item.fulljournalname,
        date: item.pubdate
      };
    });

    return results;
  } catch (error) {
    console.error("PubMed error:", error);
    return [];
  }
}

// Chat route
app.post('/chat', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.json({
      query: "No query",
      results: [],
      summary: {}
    });
  }

  // 🔥 Fetch real PubMed data
  const papers = await fetchPubMed(query);

  res.json({
    query,
    results: papers,
    summary: {
      overview: `Found ${papers.length} research papers for "${query}".`,
      key_findings: papers.map(p => p.title),
      trials: [],
      sources: papers.map(p => `${p.journal} (${p.date})`)
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});