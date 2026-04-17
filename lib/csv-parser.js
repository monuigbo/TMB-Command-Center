// CSV parser for prospect lists.
// Supports: flexible header row with aliases, RFC-4180 quoted fields,
// tab/semicolon delimiters, legacy 4-col positional fallback.
// Phase 2: no changes needed — just add more alias entries to ALIASES if new columns emerge.

const ALIASES = {
  companyName:      ["company", "business", "businessname", "companyname", "account", "name_of_business"],
  fullName:         ["name", "contact", "contactname", "fullname", "full_name", "ownername"],
  firstName:        ["first", "firstname", "fname", "givenname", "first_name"],
  lastName:         ["last", "lastname", "lname", "surname", "last_name"],
  phone:            ["phone", "mobile", "cell", "tel", "telephone", "phonenumber", "phone_number"],
  email:            ["email", "e_mail", "emailaddress", "email_address", "mail"],
  instagramHandle:  ["instagram", "ig", "insta", "instagramhandle", "ig_handle", "instagram_url", "instagramurl", "instagram_handle"],
  linkedinSlug:     ["linkedin", "li", "linkedinurl", "linkedin_url", "linkedinhandle", "linkedin_handle", "profile", "linkedinprofile"],
  facebookHandle:   ["facebook", "fb", "facebookurl", "facebook_url", "facebookhandle", "facebook_handle", "messenger", "fb_handle"],
  website:          ["website", "site", "url", "domain", "web"],
  city:             ["city", "town", "location"],
  state:            ["state", "region", "province", "st"],
  industry:         ["industry", "niche", "vertical", "category", "business_type", "businesstype"],
  notes:            ["notes", "description", "comment", "comments", "note"],
};

// Build a reverse lookup: normalized key -> canonical field name
const KEY_TO_FIELD = {};
for (const [field, aliases] of Object.entries(ALIASES)) {
  for (const alias of aliases) {
    KEY_TO_FIELD[alias] = field;
  }
}

function normalizeKey(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// State-machine tokenizer for a single RFC-4180 line.
// Handles: "quoted, fields", escaped "" inside quotes, mixed quoting.
function tokenizeLine(line, delimiter) {
  const cells = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        cell += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        cells.push(cell.trim());
        cell = "";
        i++;
      } else {
        cell += ch;
        i++;
      }
    }
  }
  cells.push(cell.trim());
  return cells;
}

// Detect delimiter by counting occurrences in the first line.
function detectDelimiter(firstLine) {
  const counts = { ",": 0, "\t": 0, ";": 0 };
  for (const ch of firstLine) {
    if (ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function isEmpty(val) {
  return !val || ["-", "n/a", "na", "none", "null", "undefined"].includes(val.toLowerCase());
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Parse CSV text into normalized prospect contact objects.
// Returns { rows, skipped, headerMap, isLegacyMode }
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], skipped: [], headerMap: {}, isLegacyMode: false };

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = tokenizeLine(lines[0], delimiter);

  // Detect if first row looks like a header row.
  // A row is a header if >50% of cells match a known alias.
  const matchCount = firstCells.filter((c) => KEY_TO_FIELD[normalizeKey(c)]).length;
  const looksLikeHeader = matchCount >= Math.ceil(firstCells.length * 0.5) || matchCount >= 2;

  let headerMap = {}; // canonical field -> raw header label
  let columnFields = []; // field name per column index (null if unrecognized)
  let dataStartLine = 0;
  let isLegacyMode = false;

  if (looksLikeHeader) {
    dataStartLine = 1;
    columnFields = firstCells.map((h) => {
      const field = KEY_TO_FIELD[normalizeKey(h)];
      if (field) headerMap[field] = h;
      return field || null;
    });
  } else {
    // Legacy positional mode: company, fullName|firstName, phone, email
    isLegacyMode = true;
    columnFields = ["companyName", "fullName", "phone", "email", null, null, null, null];
    dataStartLine = 0;
  }

  const rows = [];
  const skipped = [];

  for (let li = dataStartLine; li < lines.length; li++) {
    if (lines.length - dataStartLine > 5000) {
      skipped.push({ lineNumber: li + 1, reason: "Row limit (5000) exceeded", raw: "" });
      break;
    }

    const raw = lines[li];
    const cells = tokenizeLine(raw, delimiter);

    // Skip entirely empty rows
    if (cells.every((c) => isEmpty(c))) {
      skipped.push({ lineNumber: li + 1, reason: "Empty row", raw });
      continue;
    }

    const contact = {
      id: uid(),
      companyName: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      instagramHandle: "",
      linkedinSlug: "",
      facebookHandle: "",
      website: "",
      city: "",
      state: "",
      industry: "",
      notes: "",
      touches: {},
      status: "pending",
      drafts: {},
    };

    let hadFullName = false;

    for (let ci = 0; ci < columnFields.length && ci < cells.length; ci++) {
      const field = columnFields[ci];
      if (!field) continue;
      const val = cells[ci];
      if (isEmpty(val)) continue;

      if (field === "fullName") {
        hadFullName = true;
        const parts = val.split(/\s+/);
        if (!contact.firstName) contact.firstName = parts[0] || "";
        if (!contact.lastName) contact.lastName = parts.slice(1).join(" ") || "";
      } else {
        contact[field] = val;
      }
    }

    // If firstName was set from a "firstName" column but we also had fullName, firstName column wins — already handled above.
    // Reverse: if firstName column provided, skip the fullName split.

    rows.push(contact);
  }

  return { rows, skipped, headerMap, isLegacyMode };
}

// Returns the list of channel ids that are available for a given contact.
// Used by ProspectingStation to decide which channel buttons to enable.
export function detectChannelsAvailable(contact) {
  const channels = [];
  if (contact.phone) channels.push("phone");
  if (contact.email) channels.push("email");
  if (contact.instagramHandle) channels.push("igDm");
  if (contact.linkedinSlug) channels.push("liNote");
  if (contact.facebookHandle) channels.push("fbMsg");
  return channels;
}
