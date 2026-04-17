// Promotes a prospect contact to a CRM lead when a positive outcome is logged.
// Extracted from ColdCallStation.logOutcome — shared across all channels.
// Phase 2: source field will reflect the channel (e.g. "IG DM", "LI Connect").

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function createGHLContact(data) {
  return {
    id: uid(),
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    companyName: data.companyName || "",
    phone: data.phone || "",
    email: data.email || "",
    address1: data.address1 || "",
    city: data.city || data.city || "",
    state: data.state || "FL",
    postalCode: data.postalCode || "",
    source: data.source || "",
    tags: data.tags || [],
    industry: data.industry || "",
    temperature: data.temperature || "warm",
    pipeline: data.pipeline || "sales",
    stage: data.stage || "New Lead",
    monetaryValue: data.monetaryValue || "",
    notes: data.notes || "",
    commitments: data.commitments || [],
    createdAt: new Date().toISOString(),
    lastContactAt: data.lastContactAt || null,
    history: data.history || [{ date: new Date().toISOString(), action: "Created", note: data.notes || "" }],
    ghlSyncStatus: "not_synced",
  };
}

/**
 * Attempt to promote a prospect contact to a CRM lead.
 * Returns the new lead object if created, null if the lead already exists.
 *
 * @param {object}   contact      - prospect contact object
 * @param {string}   channelId    - "phone" | "igDm" | "liNote" | "fbMsg" | "email"
 * @param {string}   outcomeLabel - human label for the outcome (e.g. "Interested")
 * @param {string}   stage        - CRM stage to promote to
 * @param {object[]} existingLeads - current state.leads array
 * @param {string}   listName     - name of the prospect list
 * @param {string}   channelLogType - e.g. "Cold Call" | "IG DM"
 * @param {string}   [notes]      - optional notes from the user
 * @returns {{ lead: object|null, alreadyExisted: boolean }}
 */
export function promoteContactToLead(
  contact,
  channelId,
  outcomeLabel,
  stage,
  existingLeads,
  listName,
  channelLogType,
  notes = ""
) {
  const existingIdx = existingLeads.findIndex(
    (l) => l.companyName.toLowerCase() === (contact.companyName || "").toLowerCase()
  );

  if (existingIdx >= 0) {
    return { lead: null, alreadyExisted: true };
  }

  const temperature =
    outcomeLabel.toLowerCase().includes("interest") || outcomeLabel.toLowerCase() === "booked" || outcomeLabel.toLowerCase() === "replied"
      ? "hot"
      : "warm";

  const lead = createGHLContact({
    firstName: contact.firstName,
    lastName: contact.lastName,
    companyName: contact.companyName,
    phone: contact.phone,
    email: contact.email,
    city: contact.city,
    state: contact.state,
    industry: contact.industry,
    temperature,
    stage,
    source: channelLogType,
    notes: notes || `${channelLogType} from ${listName}`,
    tags: [`${channelId}-${outcomeLabel.toLowerCase().replace(/\s+/g, "-")}`, listName.toLowerCase().replace(/\s+/g, "-")],
    lastContactAt: new Date().toISOString(),
    history: [
      {
        date: new Date().toISOString(),
        action: `${channelLogType}: ${outcomeLabel}`,
        note: notes || "",
      },
    ],
  });

  return { lead, alreadyExisted: false };
}
