// Channel registry, URL normalizers, deep-link builders, and outcome enums.
// All 5 channels defined here so phase 2 (LI, FB, Email) is just a UI render toggle —
// no changes to this file needed.

// ---- Registry ----
export const CHANNELS = {
  phone: {
    id: "phone",
    label: "Call",
    logType: "Cold Call",
    field: "phone",
    icon: "📞",
    color: "#4CAF50",
    bg: "#E8F5E9",
  },
  igDm: {
    id: "igDm",
    label: "IG DM",
    logType: "IG DM",
    field: "instagramHandle",
    icon: "📷",
    color: "#E1306C",
    bg: "#FCE4EC",
  },
  liNote: {
    id: "liNote",
    label: "LinkedIn",
    logType: "LI Connect",
    field: "linkedinSlug",
    icon: "💼",
    color: "#0A66C2",
    bg: "#E3F2FD",
  },
  fbMsg: {
    id: "fbMsg",
    label: "FB Msg",
    logType: "FB Msg",
    field: "facebookHandle",
    icon: "💬",
    color: "#1877F2",
    bg: "#E8F4FD",
  },
  email: {
    id: "email",
    label: "Email",
    logType: "Email",
    field: "email",
    icon: "✉️",
    color: "#5B6AD0",
    bg: "#EDE7F6",
  },
};

// Channel order for UI strip (v1 shows phone + igDm; phase 2 enables the rest)
export const CHANNEL_ORDER = ["phone", "igDm", "liNote", "fbMsg", "email"];

// Which channels are enabled in the current UI phase.
// Phase 2: change to ["phone", "igDm", "liNote", "fbMsg", "email"]
export const ENABLED_CHANNELS = ["phone", "igDm"];

// ---- Outcome enums ----
export const CHANNEL_OUTCOMES = {
  phone: [
    { id: "interested",    label: "Interested",    color: "#27AE60", bg: "#E8F5E9", promoteTo: "Contacted" },
    { id: "callback",      label: "Call Back",     color: "#F5A623", bg: "#FFF8E1", promoteTo: "New Lead" },
    { id: "not_interested",label: "Not Interested",color: "#E74C3C", bg: "#FFEBEE", promoteTo: null },
    { id: "no_answer",     label: "No Answer",     color: "#9DAAB7", bg: "#F0F2F5", promoteTo: null },
    { id: "left_vm",       label: "Left VM",       color: "#5B6AD0", bg: "#EDE7F6", promoteTo: null },
    { id: "wrong_number",  label: "Wrong #",       color: "#888",   bg: "#F5F5F5", promoteTo: null },
  ],
  igDm: [
    { id: "sent",          label: "Sent",          color: "#E1306C", bg: "#FCE4EC", promoteTo: "Contacted" },
    { id: "replied",       label: "Replied",       color: "#27AE60", bg: "#E8F5E9", promoteTo: "Engaged" },
    { id: "booked",        label: "Booked",        color: "#F5A623", bg: "#FFF8E1", promoteTo: "Call Booked" },
    { id: "ghosted",       label: "Ghosted",       color: "#9DAAB7", bg: "#F0F2F5", promoteTo: null },
    { id: "not_a_fit",     label: "Not a Fit",     color: "#888",   bg: "#F5F5F5", promoteTo: null },
  ],
  liNote: [
    { id: "sent",          label: "Sent",          color: "#0A66C2", bg: "#E3F2FD", promoteTo: "Contacted" },
    { id: "accepted",      label: "Accepted",      color: "#27AE60", bg: "#E8F5E9", promoteTo: "Engaged" },
    { id: "replied",       label: "Replied",       color: "#F5A623", bg: "#FFF8E1", promoteTo: "Engaged" },
    { id: "ignored",       label: "Ignored",       color: "#9DAAB7", bg: "#F0F2F5", promoteTo: null },
  ],
  fbMsg: [
    { id: "sent",          label: "Sent",          color: "#1877F2", bg: "#E8F4FD", promoteTo: "Contacted" },
    { id: "replied",       label: "Replied",       color: "#27AE60", bg: "#E8F5E9", promoteTo: "Engaged" },
    { id: "ghosted",       label: "Ghosted",       color: "#9DAAB7", bg: "#F0F2F5", promoteTo: null },
  ],
  email: [
    { id: "sent",          label: "Sent",          color: "#5B6AD0", bg: "#EDE7F6", promoteTo: "Contacted" },
    { id: "replied",       label: "Replied",       color: "#27AE60", bg: "#E8F5E9", promoteTo: "Engaged" },
    { id: "bounced",       label: "Bounced",       color: "#E74C3C", bg: "#FFEBEE", promoteTo: null },
    { id: "not_interested",label: "Not Interested",color: "#888",   bg: "#F5F5F5", promoteTo: null },
  ],
};

// Outcomes that trigger lead promotion
export const POSITIVE_OUTCOME_IDS = new Set([
  "interested", "callback", "sent", "replied", "booked", "accepted",
]);

// ---- Normalizers ----

function stripUrl(input) {
  if (!input) return "";
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/$/, "");
}

export function normalizeInstagram(input) {
  if (!input) return "";
  let s = stripUrl(input);
  s = s.replace(/^instagram\.com\//i, "").replace(/^ig\.me\/m\//i, "");
  return s.replace(/^@/, "").toLowerCase();
}

export function normalizeLinkedIn(input) {
  if (!input) return "";
  let s = stripUrl(input);
  s = s.replace(/^linkedin\.com\//i, "");
  // Preserve "in/slug" or "company/slug" form
  if (!s.startsWith("in/") && !s.startsWith("company/")) s = "in/" + s;
  return s;
}

export function normalizeFacebook(input) {
  if (!input) return "";
  let s = stripUrl(input);
  s = s.replace(/^facebook\.com\//i, "").replace(/^m\.me\//i, "");
  return s.replace(/^@/, "").toLowerCase();
}

export function normalizePhone(input) {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits[0] === "1") return "+" + digits;
  return digits; // non-US: return as-is
}

export function normalizeEmail(input) {
  if (!input) return "";
  return input.trim().toLowerCase();
}

// Normalize all social handles on a contact object (mutates a copy).
export function normalizeContact(contact) {
  return {
    ...contact,
    instagramHandle: normalizeInstagram(contact.instagramHandle),
    linkedinSlug: normalizeLinkedIn(contact.linkedinSlug),
    facebookHandle: normalizeFacebook(contact.facebookHandle),
    phone: normalizePhone(contact.phone),
    email: normalizeEmail(contact.email),
  };
}

// ---- Deep-link builders ----
// iOS PWA note: native-app schemes (instagram://) silently fail from standalone mode.
// Use https:// links — iOS routes them to the native app if installed, otherwise web.

export function buildLink(channelId, contact) {
  switch (channelId) {
    case "phone":
      return { href: `tel:${contact.phone}`, canPrefill: true };
    case "email": {
      return { href: `mailto:${contact.email}`, canPrefill: true };
    }
    case "igDm":
      return {
        href: contact.instagramHandle
          ? `https://ig.me/m/${contact.instagramHandle}`
          : `https://www.instagram.com/${contact.instagramHandle}/`,
        canPrefill: false,
      };
    case "liNote":
      return {
        href: contact.linkedinSlug
          ? `https://www.linkedin.com/${contact.linkedinSlug}/`
          : "",
        canPrefill: false,
      };
    case "fbMsg":
      return {
        href: contact.facebookHandle
          ? `https://m.me/${contact.facebookHandle}`
          : "",
        canPrefill: false,
      };
    default:
      return { href: "", canPrefill: false };
  }
}

// Build mailto href with pre-filled subject + body (URL-encoded).
export function buildEmailLink(contact, subject, body) {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  return `mailto:${contact.email}?${params.toString()}`;
}
