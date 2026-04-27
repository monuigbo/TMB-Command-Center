// AI-powered message drafting for the Prospecting tab.
// Uses the same /api/chat endpoint as the rest of the app.
//
// Phase 2 channels (liNote, fbMsg, email) are stubbed with instructions already written —
// enabling them is just adding those channel IDs to ENABLED_CHANNELS in channels.js
// and letting ChannelDisclosure render them.

const DRAFT_MODEL = "claude-haiku-4-5-20251001"; // Haiku for cost efficiency on short drafts
const DRAFT_MAX_TOKENS = 400;

function stripEmDashes(s) {
  if (!s) return s;
  return s
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, "-")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ---- Channel-specific instruction builders ----

function igDmInstructions(prospect) {
  return `You are writing a cold Instagram DM on behalf of Michael from The Marketing Block (TMB).

PROSPECT:
Business: ${prospect.companyName || "Unknown"}
Contact: ${[prospect.firstName, prospect.lastName].filter(Boolean).join(" ") || "Unknown"}
Industry: ${prospect.industry || "local service business"}
City/Area: ${prospect.city || "Tampa Bay area"}
Notes: ${prospect.notes || "none"}

RULES:
- Plain conversational English. No emojis unless their industry/vibe suggests it.
- 250–350 characters MAX (Instagram DM optimal length).
- Open with ONE specific, genuine observation about their business or industry in their city.
- One clear value claim about what TMB does for businesses like theirs.
- End with ONE soft question or next-step ask — not a pitch, not a link.
- Sign off with "Michael" or "- Michael" only if space allows.
- NO: "Hi I came across your profile", generic openers, exclamation spam, links.
- NEVER use em-dashes (—) or en-dashes (–). They are an AI tell. Write natural sentences using commas, periods, or hyphens instead.
- Output ONLY the message body. No preamble, no "Here is your DM:", no markdown.`;
}

function phoneScriptInstructions(prospect) {
  return `You are writing a 15-second cold call opener script for Michael from The Marketing Block (TMB).

PROSPECT:
Business: ${prospect.companyName || "Unknown"}
Contact: ${[prospect.firstName, prospect.lastName].filter(Boolean).join(" ") || "the owner"}
Industry: ${prospect.industry || "local service business"}
City/Area: ${prospect.city || "Tampa Bay"}

RULES:
- MAX 60 words. This is spoken aloud — write for the ear, not the eye.
- Pattern: introduce (name + company in one breath) → one-line relevance hook → permission question.
- The permission question ends with something like "Is this a bad time?" or "Do you have 30 seconds?"
- No fluffy transitions. No "the reason I'm calling today is..."
- NEVER use em-dashes (—) or en-dashes (–). They are an AI tell. Write natural sentences using commas, periods, or hyphens instead.
- Output ONLY the script. No labels, no "Opener:", no markdown.`;
}

function liNoteInstructions(prospect) {
  return `You are writing a LinkedIn connection request note for Michael from The Marketing Block (TMB).

PROSPECT:
Business: ${prospect.companyName || "Unknown"}
Contact: ${[prospect.firstName, prospect.lastName].filter(Boolean).join(" ") || "Unknown"}
Industry: ${prospect.industry || "local service business"}
City/Area: ${prospect.city || "Tampa Bay area"}

RULES:
- STRICT 280 character limit (LinkedIn enforces 300 max — stay under).
- Professional but warm. Third-person reference to their company.
- NO pitch. This is a connection request, not a sales message. Just give a clear reason to connect.
- NEVER use em-dashes (—) or en-dashes (–). They are an AI tell. Write natural sentences using commas, periods, or hyphens instead.
- Output ONLY the note text. No preamble, no markdown.`;
}

function fbMsgInstructions(prospect) {
  return `You are writing a cold Facebook message on behalf of Michael from The Marketing Block (TMB).

PROSPECT:
Business: ${prospect.companyName || "Unknown"}
Contact: ${[prospect.firstName, prospect.lastName].filter(Boolean).join(" ") || "Unknown"}
Industry: ${prospect.industry || "local service business"}
City/Area: ${prospect.city || "Tampa Bay area"}
Notes: ${prospect.notes || "none"}

RULES:
- Casual and direct. Slightly warmer tone than Instagram.
- 300–450 characters. Not a wall of text.
- Open with a specific observation about their business.
- One value claim. One soft ask.
- NO links, NO exclamation overload.
- NEVER use em-dashes (—) or en-dashes (–). They are an AI tell. Write natural sentences using commas, periods, or hyphens instead.
- Output ONLY the message body. No preamble, no markdown.`;
}

function emailInstructions(prospect) {
  return `You are writing a cold outreach email for Michael from The Marketing Block (TMB).

PROSPECT:
Business: ${prospect.companyName || "Unknown"}
Contact: ${[prospect.firstName, prospect.lastName].filter(Boolean).join(" ") || "Unknown"}
Industry: ${prospect.industry || "local service business"}
City/Area: ${prospect.city || "Tampa Bay area"}
Notes: ${prospect.notes || "none"}

RULES:
- Subject: under 60 characters. Specific, not salesy.
- Body: under 120 words, 3 short paragraphs max.
- Paragraph 1: specific observation about their business (NOT "I came across your website").
- Paragraph 2: one concrete value claim about what TMB does for businesses like theirs.
- Paragraph 3: one clear CTA — a 15-minute call. Offer a specific time or ask for their availability.
- NEVER write: "I hope this email finds you well", "I wanted to reach out", "touch base", "synergy".
- Sign: Michael | The Marketing Block
- NEVER use em-dashes (—) or en-dashes (–). They are an AI tell. Write natural sentences using commas, periods, or hyphens instead.
- Output ONLY valid JSON: {"subject": "...", "body": "..."}. No preamble, no markdown wrapper.`;
}

function getInstructions(channelId, prospect) {
  switch (channelId) {
    case "igDm":   return igDmInstructions(prospect);
    case "phone":  return phoneScriptInstructions(prospect);
    case "liNote": return liNoteInstructions(prospect);
    case "fbMsg":  return fbMsgInstructions(prospect);
    case "email":  return emailInstructions(prospect);
    default:       return null;
  }
}

// ---- Business profile context block ----
// Phase 2: businessProfile will be populated from auto-learn voice dumps.
// For now it's a stub that injects anything already present.

function buildProfileContext(businessProfile) {
  if (!businessProfile?.summary && (!businessProfile?.facts || businessProfile.facts.length === 0)) {
    return "";
  }
  const factLines = (businessProfile.facts || [])
    .filter((f) => (f.confidence || 1) >= 0.6)
    .slice(0, 30)
    .map((f) => `- [${f.category}] ${f.text}`)
    .join("\n");

  return `
TMB BUSINESS CONTEXT (auto-learned):
${businessProfile.summary || ""}
${factLines ? `\nKEY FACTS:\n${factLines}` : ""}
`.trim();
}

// ---- Main export ----

/**
 * Draft a channel-specific outreach message.
 * @param {object} params
 * @param {string} params.channelId  - e.g. "igDm" | "phone" | "liNote" | "fbMsg" | "email"
 * @param {object} params.prospect   - contact object from the prospect list
 * @param {object} params.businessProfile - { summary, facts[] } — may be empty in v1
 * @returns {Promise<{text: string, subject?: string}>}
 */
export async function draftMessage({ channelId, prospect, businessProfile = {} }) {
  const channelInstructions = getInstructions(channelId, prospect);
  if (!channelInstructions) throw new Error(`Unknown channel: ${channelId}`);

  const profileContext = buildProfileContext(businessProfile);
  const system = profileContext
    ? `${channelInstructions}\n\n${profileContext}`
    : channelInstructions;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DRAFT_MODEL,
      max_tokens: DRAFT_MAX_TOKENS,
      system,
      messages: [{ role: "user", content: `Draft the ${channelId === "phone" ? "opener script" : "message"} now.` }],
    }),
  });

  if (!response.ok) throw new Error(`AI draft error: ${response.status}`);

  const data = await response.json();
  const raw = (data.content?.map((i) => i.text || "").join("\n") || "").trim();

  // Email channel returns JSON with subject + body
  if (channelId === "email") {
    try {
      const parsed = JSON.parse(raw);
      return { text: stripEmDashes(parsed.body || raw), subject: stripEmDashes(parsed.subject || "") };
    } catch {
      return { text: stripEmDashes(raw) };
    }
  }

  return { text: stripEmDashes(raw) };
}
