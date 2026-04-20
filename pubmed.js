export async function fetchPubMed(query) {
  try {
    console.log(`[PubMed] Fetching results for: "${query}"`);
    
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=20`
    );
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist || [];

    if (!ids.length) return [];

    const fetchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
    );
    const fetchData = await fetchRes.json();

    return ids.map(id => {
      const item = fetchData.result?.[id];
      if (!item) return null;

      return {
        id,
        title: item.title || "Untitled Paper",
        authors: item.authors?.map(a => a.name) || [],
        journal: item.fulljournalname || "Unknown Journal",
        year: new Date(item.pubdate).getFullYear() || new Date().getFullYear(),
        summary: item.abstract || item.title || "",
        link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        source: "PubMed",
        type: "paper"
      };
    }).filter(Boolean);
  } catch (error) {
    console.error("[PubMed API Error]:", error.message);
    return [];
  }
}