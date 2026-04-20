import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

/* ------------------ HEALTH ROUTE ------------------ */
app.get('/', (req, res) => {
  res.send("Server is running 🚀");
});

/* ------------------ PUBMED FETCH ------------------ */
async function fetchPubMed(query) {
  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=20`
    );

    const searchData = await searchRes.json();
    const ids = searchData.esearchresult.idlist;

    if (!ids.length) return [];

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
        year: new Date(item.pubdate).getFullYear() || 2023,
        link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        source: "PubMed"
      };
    });

    // 🔥 Keyword filtering
    const keywords = query.toLowerCase().split(" ");
    papers = papers.filter(p =>
      keywords.some(word => p.title.toLowerCase().includes(word))
    );

    // 🔥 Sort latest first
    papers.sort((a, b) => b.year - a.year);

    return papers.slice(0, 8);

  } catch (error) {
    console.error("PubMed error:", error);
    return [];
  }
}

/* ------------------ CLINICAL TRIALS ------------------ */
async function fetchTrials(query) {
  try {
    const res = await fetch(
      `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(query)}&pageSize=10&format=json`
    );

    const data = await res.json();

    return data.studies.map(trial => ({
      title: trial.protocolSection.identificationModule.briefTitle,
      status: trial.protocolSection.statusModule.overallStatus,
      source: "ClinicalTrials",
      year: 2024
    }));

  } catch (error) {
    console.error("Trials error:", error);
    return [];
  }
}

/* ------------------ RANKING ------------------ */
function rankResults(data) {
  return data.sort((a, b) => (b.year || 0) - (a.year || 0));
}

/* ------------------ CHAT ROUTE ------------------ */
app.post('/chat', async (req, res) => {
  const { query } = req.body;

  console.log("Query:", query);

  if (!query) {
    return res.json({
      summary: {
        overview: "No query provided",
        key_findings: [],
        sources: []
      },
      results: []
    });
  }

  try {
    // 🔥 Fetch data in parallel
    const [papers, trials] = await Promise.all([
      fetchPubMed(query),
      fetchTrials(query)
    ]);

    const combined = [...papers, ...trials];

    const ranked = rankResults(combined);

    const topResults = ranked.slice(0, 10);

    /* ------------------ SUMMARY ------------------ */
    const summary = {
      overview: `This summary is based on recent medical research related to "${query}". It highlights important findings, treatments, and ongoing clinical trials.`,

      key_findings: papers.slice(0, 5).map((p, i) =>
        `${i + 1}. ${p.title} — Study discusses aspects of ${query}, including treatment approaches or clinical outcomes.`
      ),

      sources: papers.map(p =>
        `${p.journal} (${p.date})`
      )
    };

    res.json({
      summary,
      results: topResults
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      summary: {
        overview: "Error fetching research data",
        key_findings: [],
        sources: []
      },
      results: []
    });
  }
});

/* ------------------ SERVER START ------------------ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});