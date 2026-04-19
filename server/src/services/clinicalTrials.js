const CLINICAL_TRIALS_BASE_URL = 'https://clinicaltrials.gov/api/v2/studies';
const TRIAL_LIMIT = 20;

function asArray(value) {
  if (!value) {
    return [];
  }

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

  return match ? match[0] : '';
}

function extractTrial(study) {
  const protocol = study.protocolSection || {};
  const identification = protocol.identificationModule || {};
  const status = protocol.statusModule || {};
  const contacts = protocol.contactsLocationsModule || {};
  const firstPosted = status.studyFirstPostDateStruct?.date;
  const startDate = status.startDateStruct?.date;

  return {
    title: identification.briefTitle || identification.officialTitle || '',
    status: status.overallStatus || '',
    location: asArray(contacts.locations).map(formatLocation).filter(Boolean),
    year: getYearFromDate(firstPosted || startDate)
  };
}

export async function searchClinicalTrials(query) {
  const params = new URLSearchParams({
    'query.term': query,
    pageSize: String(TRIAL_LIMIT),
    format: 'json'
  });

  const response = await fetch(`${CLINICAL_TRIALS_BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`ClinicalTrials.gov request failed with status ${response.status}`);
  }

  const data = await response.json();
  const studies = asArray(data.studies);

  return studies.map(extractTrial);
}
