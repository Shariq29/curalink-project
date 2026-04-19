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

// 🔥 Fetch PubMed data
async function fetchPubMed(query) {
  try {
    // Step 1: Search IDs
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=10`
    );

    const searchData = await searchRes.json();
    const ids = searchData.esearchresult.idlist;

    if (!ids.length) return [];

    // Step 2: Fetch details
    const fetchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
    );

    const fetchData = await fetchRes.json();

    let papers = ids.map(id => {
      const item = fetchData.result[id];

      return {
        id,
        title: item.title,
        authors: item.authors?.map(a => a.name).join(", "),
        journal: item.fulljournalname,
        date: item.pubdate,
        link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
      };
    });

    // 🔥 FILTER (relevant only)
    papers = papers.filter(p =>
      p.title.toLowerCase().includes(query.toLowerCase())
    );

    // 🔥 SORT (latest first)
    papers.sort((a, b) => new Date(b.date) - new Date(a.date));

    return papers;

  } catch (error) {
    console.error("PubMed error:", error);
    return [];
  }
}

// 🔥 Chat route
app.post('/chat', async (req, res) => {
  const { query } = req.body;

  console.log("Received query:", query);

  if (!query) {
    return res.json({
      query: "No query",
      results: [],
      summary: {
        overview: "No query provided",
        key_findings: [],
        trials: [],
        sources: []
      }
    });
  }

  const papers = await fetchPubMed(query);

  res.json({
    query,
    results: papers,

    summary: {
      overview: `Here are the latest research insights on "${query}" from PubMed.`,

      key_findings: papers.map((p, i) =>
        `${i + 1}. ${p.title}`
      ),

      trials: [],

      sources: papers.map(p =>
        `${p.journal} (${p.date})`
      )
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});