const CLINICAL_TRIALS_BASE_URL = 'https://clinicaltrials.gov/api/v2/studies';
const TRIAL_LIMIT = 25;

/* ------------------ HELPERS ------------------ */
function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatLocation(location) {
  return [
    location.facility,
    location.city,
    location.state,
    location.country
  ]
    .filter(Boolean)
    .join(', ');
}

function getYearFromDate(date) {
  const match = String(date || '').match(/\b(18|19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

/* ------------------ SCORING ------------------ */
function getTrialScore(trial) {
  let score = 0;

  // Prefer recruiting trials
  if (trial.status?.toLowerCase().includes('recruiting')) {
    score += 5;
  }

  // Prefer recent trials
  if (trial.year) {
    score += (trial.year - 2000) * 0.1;
  }

  return score;
}

/* ------------------ EXTRACT ------------------ */
function extractTrial(study) {
  const protocol = study.protocolSection || {};
  const identification = protocol.identificationModule || {};
  const status = protocol.statusModule || {};
  const contacts = protocol.contactsLocationsModule || {};

  const firstPosted = status.studyFirstPostDateStruct?.date;
  const startDate = status.startDateStruct?.date;

  const trial = {
    type: "trial",
    source: "ClinicalTrials",
    title: identification.briefTitle || identification.officialTitle || "No title",
    status: status.overallStatus || "Unknown",
    location: asArray(contacts.locations).map(formatLocation).filter(Boolean),
    year: getYearFromDate(firstPosted || startDate)
  };

  // Add score for ranking pipeline
  trial.score = getTrialScore(trial);

  return trial;
}

/* ------------------ MAIN FUNCTION ------------------ */
export async function searchClinicalTrials(query) {
  try {
    const params = new URLSearchParams({
      'query.term': query,
      pageSize: String(TRIAL_LIMIT),
      format: 'json'
    });

    const response = await fetch(`${CLINICAL_TRIALS_BASE_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`ClinicalTrials API failed: ${response.status}`);
    }

    const data = await response.json();
    const studies = asArray(data.studies);

    let trials = studies.map(extractTrial);

    /* ------------------ SORT (BEST FIRST) ------------------ */
    trials.sort((a, b) => (b.score || 0) - (a.score || 0));

    /* ------------------ LIMIT ------------------ */
    return trials.slice(0, 10);

  } catch (error) {
    console.error("ClinicalTrials error:", error.message);
    return [];
  }
}