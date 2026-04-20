export async function fetchTrials(query) {
  try {
    console.log(`[ClinicalTrials] Fetching results for: "${query}"`);
    
    const res = await fetch(
      `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(query)}&pageSize=10&format=json`
    );
    const data = await res.json();
    const studies = data.studies || [];

    return studies.map(trial => {
      const protocol = trial.protocolSection || {};
      const idModule = protocol.identificationModule || {};
      const statusModule = protocol.statusModule || {};
      const descModule = protocol.descriptionModule || {};

      return {
        id: idModule.nctId || "Unknown NCT",
        title: idModule.briefTitle || "Untitled Trial",
        status: statusModule.overallStatus || "Unknown Status",
        year: new Date(statusModule.startDateStruct?.date || Date.now()).getFullYear(),
        summary: descModule.briefSummary || idModule.briefTitle || "",
        source: "ClinicalTrials",
        type: "trial"
      };
    });
  } catch (error) {
    console.error("[ClinicalTrials API Error]:", error.stack || error);
    return [];
  }
}