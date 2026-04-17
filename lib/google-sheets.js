// Google Sheets URL parsing + CSV export URL building.
// Works with any public "Anyone with link can view" sheet — no API key.

// Supported URL shapes:
//   https://docs.google.com/spreadsheets/d/<ID>/edit#gid=<GID>
//   https://docs.google.com/spreadsheets/d/<ID>/edit?usp=sharing
//   https://docs.google.com/spreadsheets/d/<ID>/
//   https://docs.google.com/spreadsheets/d/<ID>/edit?gid=<GID>#gid=<GID>
//   raw ID string (44-char alphanumeric-ish)
export function parseSheetUrl(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const id = idMatch ? idMatch[1] : (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed) ? trimmed : null);
  if (!id) return null;

  // gid can live in the hash (#gid=123) or query (?gid=123)
  const gidMatch = trimmed.match(/[#?&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  return { id, gid };
}

export function buildCsvExportUrl({ id, gid }) {
  const base = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  return gid ? `${base}&gid=${gid}` : base;
}
