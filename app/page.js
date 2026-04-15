"use client";
import { useState, useEffect } from "react";

// ============================================
// TMB COMMAND CENTER v3
// GHL-Aligned / Cold Call Dialer / AI Co-Pilot
// Secure: all AI calls go through /api/chat
// ============================================

const SALES_STAGES = ["New Lead", "Contacted", "Engaged", "Call Booked", "Proposal Sent", "Closed Won", "Closed Lost"];
const FULFILLMENT_STAGES = ["Onboarding", "In Progress", "Waiting on Client", "Review", "Live"];
const SALES_COLORS = {
  "New Lead": "#4CAF50", Contacted: "#5B6AD0", Engaged: "#2196F3",
  "Call Booked": "#F5A623", "Proposal Sent": "#E67E22", "Closed Won": "#27AE60", "Closed Lost": "#E74C3C",
};
const SALES_BG = {
  "New Lead": "#E8F5E9", Contacted: "#EDE7F6", Engaged: "#E3F2FD",
  "Call Booked": "#FFF8E1", "Proposal Sent": "#FFF3E0", "Closed Won": "#E8F5E9", "Closed Lost": "#FFEBEE",
};
const FULFILLMENT_COLORS = {
  Onboarding: "#5B6AD0", "In Progress": "#2196F3", "Waiting on Client": "#F5A623", Review: "#E67E22", Live: "#27AE60",
};
const FULFILLMENT_BG = {
  Onboarding: "#EDE7F6", "In Progress": "#E3F2FD", "Waiting on Client": "#FFF8E1", Review: "#FFF3E0", Live: "#E8F5E9",
};

const INDUSTRIES = [
  "Contractor", "Plumber", "HVAC", "Electrician", "Roofer", "Landscaper",
  "Painter", "Pool Service", "Pest Control", "Cleaning", "Tree Service",
  "Garage Door", "Fencing", "Flooring", "Handyman", "MedSpa",
  "Chiropractor", "Tattoo Studio", "Other",
];

const CALL_OUTCOMES = [
  { id: "interested", label: "Interested", color: "#27AE60", bg: "#E8F5E9", promoteTo: "Contacted" },
  { id: "callback", label: "Call Back", color: "#F5A623", bg: "#FFF8E1", promoteTo: "New Lead" },
  { id: "not_interested", label: "Not Interested", color: "#E74C3C", bg: "#FFEBEE", promoteTo: null },
  { id: "no_answer", label: "No Answer", color: "#9DAAB7", bg: "#F0F2F5", promoteTo: null },
  { id: "left_vm", label: "Left VM", color: "#5B6AD0", bg: "#EDE7F6", promoteTo: null },
  { id: "wrong_number", label: "Wrong #", color: "#888", bg: "#F5F5F5", promoteTo: null },
];

const PROSPECTING_TYPES = ["Walk-in", "DM", "Cold Call", "Email", "Follow-up"];

// -- Utilities --
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function today() {
  return new Date().toISOString().split("T")[0];
}
function daysAgo(d) {
  if (!d) return Infinity;
  return Math.floor((new Date() - new Date(d)) / 86400000);
}
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// -- Storage --
const STORE_KEY = "tmb_cc_v3";
const DEFAULT_STATE = {
  leads: [],
  tasks: [],
  prospectingLog: [],
  aiConversations: [],
  callLists: [],
  settings: { dailyTarget: 5 },
};

function loadState() {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(s) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {}
}

// -- GHL Contact Factory --
function createGHLContact(data) {
  return {
    id: uid(),
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    companyName: data.companyName || "",
    phone: data.phone || "",
    email: data.email || "",
    address1: data.address1 || "",
    city: data.city || "",
    state: data.state || "",
    postalCode: data.postalCode || "",
    source: data.source || "",
    tags: data.tags || [],
    industry: data.industry || "",
    temperature: data.temperature || "",
    pipeline: data.pipeline || "sales",
    stage: data.stage || "New Lead",
    monetaryValue: data.monetaryValue || "",
    notes: data.notes || "",
    commitments: data.commitments || [],
    createdAt: new Date().toISOString(),
    lastContactAt: data.lastContactAt || null,
    history: data.history || [
      { date: new Date().toISOString(), action: "Created", note: data.notes || "" },
    ],
    ghlSyncStatus: "not_synced",
  };
}

// -- Theme --
const C = {
  bg: "#F0F2F5",
  card: "#FFFFFF",
  cardBorder: "#E8ECF0",
  text: "#1A2B3C",
  textSecondary: "#6B7C8D",
  textMuted: "#9DAAB7",
  green: "#4CAF50",
  greenLight: "#E8F5E9",
  greenDark: "#2E7D32",
  amber: "#F5A623",
  amberLight: "#FFF8E1",
  amberBg: "#FEF3C7",
  red: "#E74C3C",
  redLight: "#FFEBEE",
  blue: "#5B6AD0",
  blueLight: "#EDE7F6",
  shadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const cardS = {
  background: C.card,
  borderRadius: 16,
  padding: "18px 20px",
  boxShadow: C.shadow,
  marginBottom: 14,
  border: `1px solid ${C.cardBorder}`,
};

const inputS = {
  width: "100%",
  boxSizing: "border-box",
  background: "#F7F8FA",
  border: "1.5px solid #E2E6EA",
  borderRadius: 12,
  padding: "12px 16px",
  color: C.text,
  fontSize: 15,
  outline: "none",
  fontFamily: "inherit",
};

// ============================================
// AI SYSTEM PROMPT BUILDER
// ============================================
function buildSystemPrompt(state) {
  const salesLeads = state.leads.filter(
    (l) => l.pipeline === "sales" && l.stage !== "Closed Won" && l.stage !== "Closed Lost"
  );
  const overdueLeads = salesLeads.filter((l) => {
    const d = l.lastContactAt ? daysAgo(l.lastContactAt) : daysAgo(l.createdAt);
    return d > 3;
  });
  const todayLog = state.prospectingLog.filter((p) => p.date === today());
  const target = state.settings?.dailyTarget || 5;

  const leadSummaries = salesLeads
    .slice(0, 15)
    .map((l) => {
      const d = l.lastContactAt ? daysAgo(l.lastContactAt) : daysAgo(l.createdAt);
      const ln = l.history?.slice(-1)[0];
      return `- ${l.companyName}${l.firstName ? ` (${l.firstName} ${l.lastName})` : ""} | ${l.stage} | ${d}d | ${l.temperature || "?"} | ${l.industry || "?"} | ${ln?.note?.slice(0, 60) || ln?.action || "none"}${l.commitments?.length ? ` | Commits: ${l.commitments.join("; ")}` : ""}`;
    })
    .join("\n");

  const overdueSummaries = overdueLeads
    .slice(0, 5)
    .map((l) => {
      const d = l.lastContactAt ? daysAgo(l.lastContactAt) : daysAgo(l.createdAt);
      return `- ${l.companyName}: ${d}d, "${l.history?.slice(-1)[0]?.note?.slice(0, 50) || "none"}"`;
    })
    .join("\n");

  const openTasks = state.tasks
    .filter((t) => !t.done)
    .slice(0, 10)
    .map((t) => `- ${t.text}${t.linkedLead ? ` [${t.linkedLead}]` : ""}`)
    .join("\n");

  return `You are Michael's AI business partner and prospecting coach for The Marketing Block (TMB), a digital marketing agency in Tampa/St. Pete that builds automated revenue systems for local service businesses (contractors, home services, MedSpas, etc).

PERSONALITY: Direct. No fluff. Push Michael toward prospecting when he's slacking. Celebrate wins briefly then "what's next". 2-4 paragraphs max. Mobile-first.

WHEN MICHAEL VOICE-DUMPS A PROSPECT INTERACTION, respond conversationally then append JSON:
\`\`\`json
{
  "extractedLead": {
    "firstName": "", "lastName": "", "companyName": "", "phone": "", "email": "",
    "city": "", "state": "FL", "industry": "",
    "temperature": "hot|warm|cold",
    "stage": "New Lead|Contacted|Engaged|Call Booked|Proposal Sent",
    "notes": "summary", "source": "Walk-in|Cold Call|DM|Referral|Other",
    "commitments": ["promises made"], "tags": ["relevant-tags"],
    "monetaryValue": "estimated deal value or empty"
  },
  "extractedTasks": [{"text": "task", "priority": "high|medium|low", "linkedLead": "Company"}],
  "prospectingActivity": {"type": "Walk-in|DM|Cold Call|Email|Follow-up", "count": 1}
}
\`\`\`
Only include JSON when lead data exists. Use "updateExisting": true if updating known lead.

STATE (${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}):
Sales Pipeline: ${salesLeads.length} active
${leadSummaries || "Empty. Push Michael."}
Overdue (3+ days): ${overdueSummaries || "None"}
Prospecting: ${todayLog.length}/${target} ${todayLog.length < target ? `(BEHIND by ${target - todayLog.length})` : "(HIT)"}
Tasks: ${openTasks || "None"}
RULES: Push if behind on prospecting. Mention overdue leads. Keep it SHORT.`;
}

// ============================================
// SECURE AI CALL (through /api/chat)
// ============================================
async function callAI(system, userMessage) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.map((i) => i.text || "").join("\n") || "No response.";
}

// ============================================
// COMPONENTS
// ============================================

function ProspectingRing({ count, target }) {
  const pct = Math.min(100, (count / target) * 100);
  const r = 50;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = count >= target ? C.green : count > 0 ? C.amber : C.red;

  return (
    <div style={{ ...cardS, display: "flex", alignItems: "center", gap: 18, padding: "18px 22px" }}>
      <div style={{ position: "relative", width: 108, height: 108, flexShrink: 0 }}>
        <svg width="108" height="108" viewBox="0 0 108 108">
          <circle cx="54" cy="54" r={r} fill="none" stroke="#EEF0F2" strokeWidth="9" />
          <circle
            cx="54" cy="54" r={r} fill="none" stroke={color} strokeWidth="9"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            transform="rotate(-90 54 54)" style={{ transition: "stroke-dashoffset 0.8s" }}
          />
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color }}>{Math.round(pct)}%</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Prospecting</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.text }}>
          {count}<span style={{ fontSize: 16, color: C.textMuted, fontWeight: 500 }}>/{target}</span>
        </div>
        <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
          {count >= target ? "Target hit!" : `${target - count} to go`}
        </div>
      </div>
    </div>
  );
}

function SalesPipelineBar({ leads }) {
  const salesLeads = leads.filter((l) => l.pipeline === "sales");
  const stages = SALES_STAGES.filter((s) => s !== "Closed Lost");

  return (
    <div style={cardS}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Sales Pipeline</div>
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        {stages.map((s) => {
          const ct = salesLeads.filter((l) => l.stage === s).length;
          const total = salesLeads.length || 1;
          return (
            <div key={s} style={{ flex: Math.max(ct / total, 0.06), height: 7, background: ct > 0 ? SALES_COLORS[s] || "#CCC" : "#EEF0F2", borderRadius: 4 }} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", overflowX: "auto", gap: 2 }}>
        {stages.map((s) => {
          const ct = salesLeads.filter((l) => l.stage === s).length;
          return (
            <div key={s} style={{ textAlign: "center", minWidth: 42, flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: SALES_COLORS[s] || "#666" }}>{ct}</div>
              <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600, lineHeight: 1.2 }}>{s}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverdueAlerts({ leads }) {
  const overdue = leads
    .filter((l) => {
      if (l.pipeline !== "sales" || l.stage === "Closed Won" || l.stage === "Closed Lost") return false;
      return (l.lastContactAt ? daysAgo(l.lastContactAt) : daysAgo(l.createdAt)) > 3;
    })
    .sort((a, b) => {
      const da = a.lastContactAt ? daysAgo(a.lastContactAt) : daysAgo(a.createdAt);
      const db = b.lastContactAt ? daysAgo(b.lastContactAt) : daysAgo(b.createdAt);
      return db - da;
    });

  if (!overdue.length) return null;

  return (
    <div style={{ ...cardS, borderLeft: `4px solid ${C.amber}`, background: "#FFFDF5" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#B7791F", marginBottom: 8 }}>
        Follow-Up Needed ({overdue.length})
      </div>
      {overdue.slice(0, 4).map((l) => {
        const d = l.lastContactAt ? daysAgo(l.lastContactAt) : daysAgo(l.createdAt);
        return (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F0EBD8" }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{l.companyName}</span>
              {l.commitments?.[0] && (
                <div style={{ fontSize: 12, color: C.red, marginTop: 1 }}>Promised: {l.commitments[0]}</div>
              )}
            </div>
            <span style={{ background: d > 7 ? C.redLight : C.amberLight, color: d > 7 ? C.red : "#B7791F", padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
              {d}d
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VoiceDumpZone({ onSubmit, isProcessing }) {
  const [text, setText] = useState("");

  return (
    <div style={{ ...cardS, border: `2px dashed ${C.green}40`, background: "#FAFFF9" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: C.greenLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Voice Dump</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>Use mic button, ramble about prospects</div>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g. "Just left ABC Plumbing on Main St, talked to Mike the owner..."'
        rows={3}
        style={{ ...inputS, resize: "vertical", lineHeight: 1.6 }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          onClick={() => {
            if (text.trim() && !isProcessing) {
              onSubmit(text.trim());
              setText("");
            }
          }}
          disabled={isProcessing || !text.trim()}
          style={{
            background: isProcessing ? "#CCC" : C.green,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "11px 24px",
            fontSize: 14,
            fontWeight: 700,
            cursor: isProcessing ? "not-allowed" : "pointer",
            opacity: !text.trim() ? 0.4 : 1,
          }}
        >
          {isProcessing ? "Processing..." : "Send to AI"}
        </button>
      </div>
    </div>
  );
}

function AIResponse({ conversation }) {
  const [copied, setCopied] = useState(false);
  if (!conversation) return null;

  return (
    <div style={{ ...cardS, padding: 0, overflow: "hidden" }}>
      <div style={{ background: "#F7F8FA", padding: "10px 18px", borderBottom: "1px solid #EEF0F2" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>
          You - {fmtTime(conversation.timestamp)}
        </div>
        <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 3, lineHeight: 1.4 }}>
          {conversation.userMessage.length > 120
            ? conversation.userMessage.slice(0, 120) + "..."
            : conversation.userMessage}
        </div>
      </div>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#4CAF50,#81C784)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>
            AI
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>Co-Pilot</span>
        </div>
        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
          {conversation.aiResponse}
        </div>
        {conversation.extractedData && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid #EEF0F2" }}>
            {conversation.extractedData.extractedLead && (
              <span style={{ fontSize: 11, background: C.greenLight, color: C.greenDark, padding: "4px 10px", borderRadius: 7, fontWeight: 600 }}>
                Lead: {conversation.extractedData.extractedLead.companyName}
              </span>
            )}
            {conversation.extractedData.extractedTasks?.length > 0 && (
              <span style={{ fontSize: 11, background: C.amberBg, color: "#92400E", padding: "4px 10px", borderRadius: 7, fontWeight: 600 }}>
                {conversation.extractedData.extractedTasks.length} task(s)
              </span>
            )}
            {conversation.extractedData.prospectingActivity && (
              <span style={{ fontSize: 11, background: C.blueLight, color: C.blue, padding: "4px 10px", borderRadius: 7, fontWeight: 600 }}>
                +1 {conversation.extractedData.prospectingActivity.type}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => {
            navigator.clipboard.writeText(conversation.aiResponse);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{ background: "#F0F2F5", color: C.textSecondary, border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", marginTop: 10 }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function QuickLog() {
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        style={{ width: "100%", background: C.card, border: "2px dashed #D0D5DD", borderRadius: 12, padding: 11, color: C.green, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}
      >
        + Log Activity
      </button>
    );
  }

  return (
    <div style={{ ...cardS, padding: 12 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PROSPECTING_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => {
              window.dispatchEvent(new CustomEvent("tmb-log", { detail: { type: t } }));
              setShow(false);
            }}
            style={{ background: C.greenLight, color: C.greenDark, border: `1px solid ${C.green}30`, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {t}
          </button>
        ))}
      </div>
      <button onClick={() => setShow(false)} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 11, marginTop: 8, cursor: "pointer" }}>
        Cancel
      </button>
    </div>
  );
}

// ============================================
// COLD CALL DIALER
// ============================================
function ColdCallStation({ state, setState }) {
  const [activeListId, setActiveListId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [listName, setListName] = useState("");
  const [listIndustry, setListIndustry] = useState("Contractor");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [callNote, setCallNote] = useState("");
  const [inSession, setInSession] = useState(false);
  const [sessionStats, setSessionStats] = useState({ calls: 0, interested: 0, callbacks: 0, noAnswer: 0 });

  const activeList = state.callLists.find((l) => l.id === activeListId);
  const uncalledContacts = activeList?.contacts.filter((c) => c.status === "pending") || [];
  const currentContact = uncalledContacts[currentIdx] || null;
  const todayCalls = state.prospectingLog.filter((p) => p.date === today() && p.type === "Cold Call").length;

  const importList = () => {
    if (!csvText.trim() || !listName.trim()) return;
    const lines = csvText.trim().split("\n").filter((l) => l.trim());
    const contacts = lines.map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      const nameParts = (parts[1] || "").split(" ");
      return {
        id: uid(),
        companyName: parts[0] || "Unknown",
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        phone: parts[2] || "",
        email: parts[3] || "",
        industry: listIndustry,
        status: "pending",
        outcome: null,
        notes: "",
        callHistory: [],
      };
    });
    const newList = {
      id: uid(),
      name: listName.trim(),
      industry: listIndustry,
      createdAt: new Date().toISOString(),
      contacts,
    };
    setState((prev) => ({ ...prev, callLists: [...prev.callLists, newList] }));
    setActiveListId(newList.id);
    setCsvText("");
    setListName("");
    setShowImport(false);
  };

  const logOutcome = (outcomeId) => {
    if (!currentContact || !activeList) return;
    const outcome = CALL_OUTCOMES.find((o) => o.id === outcomeId);
    const updatedContact = {
      ...currentContact,
      status: "called",
      outcome: outcomeId,
      notes: callNote.trim(),
      calledAt: new Date().toISOString(),
      callHistory: [
        ...(currentContact.callHistory || []),
        { date: new Date().toISOString(), outcome: outcomeId, notes: callNote.trim() },
      ],
    };
    const updatedList = {
      ...activeList,
      contacts: activeList.contacts.map((c) => (c.id === currentContact.id ? updatedContact : c)),
    };

    let newLeads = [...state.leads];
    const newLog = [
      ...state.prospectingLog,
      {
        date: today(),
        type: "Cold Call",
        timestamp: new Date().toISOString(),
        listId: activeList.id,
        contactId: currentContact.id,
        outcome: outcomeId,
      },
    ];

    if (outcome?.promoteTo) {
      const existingIdx = newLeads.findIndex(
        (l) => l.companyName.toLowerCase() === currentContact.companyName.toLowerCase()
      );
      if (existingIdx < 0) {
        newLeads.unshift(
          createGHLContact({
            firstName: currentContact.firstName,
            lastName: currentContact.lastName,
            companyName: currentContact.companyName,
            phone: currentContact.phone,
            email: currentContact.email,
            industry: currentContact.industry,
            temperature: outcomeId === "interested" ? "hot" : "warm",
            stage: outcome.promoteTo,
            source: "Cold Call",
            notes: callNote.trim() || `Cold called from ${activeList.name}`,
            tags: [`cold-call-${outcomeId}`, activeList.name.toLowerCase().replace(/\s+/g, "-")],
            lastContactAt: new Date().toISOString(),
            history: [
              {
                date: new Date().toISOString(),
                action: `Cold call: ${outcome.label}`,
                note: callNote.trim(),
              },
            ],
          })
        );
      }
    }

    setSessionStats((prev) => ({
      calls: prev.calls + 1,
      interested: prev.interested + (outcomeId === "interested" ? 1 : 0),
      callbacks: prev.callbacks + (outcomeId === "callback" ? 1 : 0),
      noAnswer: prev.noAnswer + (outcomeId === "no_answer" ? 1 : 0),
    }));

    setState((prev) => ({
      ...prev,
      callLists: prev.callLists.map((l) => (l.id === activeList.id ? updatedList : l)),
      leads: newLeads,
      prospectingLog: newLog,
    }));
    setCallNote("");
  };

  const exportGHLCSV = () => {
    if (!activeList) return;
    const headers = "firstName,lastName,companyName,phone,email,source,tags,industry,notes";
    const rows = activeList.contacts
      .filter((c) => c.outcome === "interested" || c.outcome === "callback")
      .map(
        (c) =>
          `"${c.firstName}","${c.lastName}","${c.companyName}","${c.phone}","${c.email}","Cold Call","cold-call-${c.outcome}","${c.industry}","${(c.notes || "").replace(/"/g, '""')}"`
      );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ghl-import-${activeList.name.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // LIST VIEW
  if (!inSession) {
    return (
      <div>
        <div style={{ ...cardS, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {[
            { v: todayCalls, l: "Calls Today", c: C.green },
            { v: sessionStats.interested, l: "Interested", c: C.green },
            { v: sessionStats.callbacks, l: "Callbacks", c: C.amber },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Call Lists</div>

        {state.callLists.map((list) => {
          const pending = list.contacts.filter((c) => c.status === "pending").length;
          const called = list.contacts.filter((c) => c.status === "called").length;
          const interested = list.contacts.filter((c) => c.outcome === "interested").length;
          return (
            <div key={list.id} style={{ ...cardS, cursor: "pointer" }} onClick={() => { setActiveListId(list.id); setCurrentIdx(0); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{list.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{list.industry} - {list.contacts.length} contacts</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>{interested} interested</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{pending} remaining</div>
                </div>
              </div>
              <div style={{ marginTop: 8, height: 5, background: "#EEF0F2", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${(called / (list.contacts.length || 1)) * 100}%`, height: "100%", background: C.green, borderRadius: 3 }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveListId(list.id);
                    setCurrentIdx(0);
                    setInSession(true);
                    setSessionStats({ calls: 0, interested: 0, callbacks: 0, noAnswer: 0 });
                  }}
                  style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", flex: 1 }}
                >
                  Start Calling ({pending})
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveListId(list.id);
                    exportGHLCSV();
                  }}
                  style={{ background: "#F0F2F5", color: C.textSecondary, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Export GHL
                </button>
              </div>
            </div>
          );
        })}

        {state.callLists.length === 0 && !showImport && (
          <div style={{ ...cardS, textAlign: "center", padding: 30, color: C.textMuted }}>
            No call lists yet. Import a CSV to start dialing.
          </div>
        )}

        {!showImport ? (
          <button
            onClick={() => setShowImport(true)}
            style={{ width: "100%", background: C.card, border: "2px dashed #D0D5DD", borderRadius: 14, padding: 14, color: C.green, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            + Import Call List (CSV)
          </button>
        ) : (
          <div style={cardS}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Import Call List</div>
            <input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="List name (e.g. Tampa Contractors April)" style={{ ...inputS, marginBottom: 8 }} />
            <select value={listIndustry} onChange={(e) => setListIndustry(e.target.value)} style={{ ...inputS, marginBottom: 8, cursor: "pointer" }}>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
              CSV format: business_name, contact_name, phone, email
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={5}
              placeholder={"ABC Plumbing, Mike Johnson, 813-555-0101, mike@abcplumb.com\nQuick Fix HVAC, Sarah Lee, 727-555-0202, sarah@quickfix.com"}
              style={{ ...inputS, fontFamily: "monospace", fontSize: 13, resize: "vertical", marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={importList} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Import
              </button>
              <button onClick={() => { setShowImport(false); setCsvText(""); setListName(""); }} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ACTIVE CALLING SESSION
  return (
    <div>
      <div style={{ ...cardS, background: C.greenLight, border: `1.5px solid ${C.green}40` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.greenDark }}>Calling: {activeList?.name}</div>
            <div style={{ fontSize: 12, color: C.textSecondary }}>{uncalledContacts.length} remaining</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{sessionStats.calls}</div>
              <div style={{ fontSize: 9, color: C.textMuted }}>calls</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.amber }}>{sessionStats.interested}</div>
              <div style={{ fontSize: 9, color: C.textMuted }}>hot</div>
            </div>
            <button
              onClick={() => setInSession(false)}
              style={{ background: "#fff", color: C.red, border: `1.5px solid ${C.red}40`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              End
            </button>
          </div>
        </div>
      </div>

      {currentContact ? (
        <div style={{ ...cardS, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 22px", borderBottom: "1px solid #EEF0F2" }}>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              #{activeList.contacts.filter((c) => c.status === "called").length + 1} of {activeList.contacts.length}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>{currentContact.companyName}</div>
            {(currentContact.firstName || currentContact.lastName) && (
              <div style={{ fontSize: 15, color: C.textSecondary, marginBottom: 2 }}>
                {currentContact.firstName} {currentContact.lastName}
              </div>
            )}
            <div style={{ display: "inline-block", fontSize: 11, background: C.amberLight, color: "#B7791F", padding: "3px 10px", borderRadius: 6, fontWeight: 600, marginTop: 4 }}>
              {currentContact.industry}
            </div>
          </div>

          <div style={{ padding: "16px 22px", background: "#FAFFF9", borderBottom: "1px solid #EEF0F2" }}>
            <a
              href={`tel:${currentContact.phone}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                background: C.green,
                color: "#fff",
                borderRadius: 14,
                padding: "16px 20px",
                textDecoration: "none",
                fontSize: 18,
                fontWeight: 800,
                boxShadow: "0 4px 12px rgba(76,175,80,0.3)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {currentContact.phone || "No phone"}
            </a>
            {currentContact.email && (
              <div style={{ fontSize: 13, color: C.blue, textAlign: "center", marginTop: 8 }}>{currentContact.email}</div>
            )}
          </div>

          <div style={{ padding: "14px 22px", borderBottom: "1px solid #EEF0F2" }}>
            <textarea
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              placeholder="Call notes... what happened? What did they say?"
              rows={3}
              style={{ ...inputS, resize: "vertical", fontSize: 14 }}
            />
          </div>

          <div style={{ padding: "14px 22px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Tag Outcome
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {CALL_OUTCOMES.map((o) => (
                <button
                  key={o.id}
                  onClick={() => logOutcome(o.id)}
                  style={{
                    background: o.bg,
                    color: o.color,
                    border: `1.5px solid ${o.color}30`,
                    borderRadius: 12,
                    padding: "12px 8px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setCurrentIdx((prev) => prev + 1);
                setCallNote("");
              }}
              style={{ width: "100%", background: "#F7F8FA", color: C.textMuted, border: "1px solid #E2E6EA", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 10 }}
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        <div style={{ ...cardS, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.green, marginBottom: 8 }}>List Complete!</div>
          <div style={{ color: C.textSecondary, marginBottom: 16 }}>
            {sessionStats.calls} calls, {sessionStats.interested} interested, {sessionStats.callbacks} callbacks
          </div>
          <button
            onClick={() => setInSession(false)}
            style={{ background: C.green, color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            Done
          </button>
        </div>
      )}

      {sessionStats.calls > 0 && currentContact && (
        <div style={cardS}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            This Session
          </div>
          {activeList.contacts
            .filter((c) => c.status === "called")
            .slice(-5)
            .reverse()
            .map((c) => {
              const oc = CALL_OUTCOMES.find((o) => o.id === c.outcome);
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F0F2F5" }}>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{c.companyName}</span>
                  <span style={{ fontSize: 11, background: oc?.bg || "#F0F2F5", color: oc?.color || "#888", padding: "3px 10px", borderRadius: 6, fontWeight: 700 }}>
                    {oc?.label || c.outcome}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ============================================
// LEAD CARD
// ============================================
function LeadCard({ lead, onUpdate, onAddNote }) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showStages, setShowStages] = useState(false);
  const daysSince = lead.lastContactAt ? daysAgo(lead.lastContactAt) : daysAgo(lead.createdAt);
  const isOverdue = daysSince > 3 && lead.stage !== "Closed Won" && lead.stage !== "Closed Lost";
  const stages = lead.pipeline === "fulfillment" ? FULFILLMENT_STAGES : SALES_STAGES;
  const colors = lead.pipeline === "fulfillment" ? FULFILLMENT_COLORS : SALES_COLORS;
  const bgs = lead.pipeline === "fulfillment" ? FULFILLMENT_BG : SALES_BG;
  const tempColor = lead.temperature === "hot" ? C.red : lead.temperature === "warm" ? C.amber : lead.temperature === "cold" ? "#5B9BD5" : C.textMuted;
  const tempBg = lead.temperature === "hot" ? C.redLight : lead.temperature === "warm" ? C.amberLight : lead.temperature === "cold" ? "#EBF5FB" : "#F0F2F5";

  return (
    <div style={{ ...cardS, marginBottom: 10, borderLeft: isOverdue ? `4px solid ${C.red}` : `4px solid ${colors[lead.stage] || "#CCC"}`, cursor: "pointer" }}>
      <div onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{lead.companyName}</span>
              {lead.temperature && (
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: tempBg, color: tempColor, fontWeight: 700, textTransform: "uppercase" }}>
                  {lead.temperature}
                </span>
              )}
              {lead.industry && (
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: "#F0F2F5", color: C.textMuted, fontWeight: 600 }}>
                  {lead.industry}
                </span>
              )}
            </div>
            {(lead.firstName || lead.lastName) && (
              <div style={{ fontSize: 13, color: C.textSecondary }}>
                {lead.firstName} {lead.lastName}
              </div>
            )}
          </div>
          <span
            onClick={(e) => { e.stopPropagation(); setShowStages(!showStages); }}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, background: bgs[lead.stage] || "#F0F2F5", color: colors[lead.stage] || "#666", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {lead.stage}
          </span>
        </div>
        {lead.notes && !expanded && (
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, lineHeight: 1.4 }}>
            {lead.notes.length > 90 ? lead.notes.slice(0, 90) + "..." : lead.notes}
          </div>
        )}
      </div>

      {showStages && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px solid #EEF0F2" }}>
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => {
                onUpdate({
                  ...lead,
                  stage: s,
                  lastContactAt: new Date().toISOString(),
                  history: [...(lead.history || []), { date: new Date().toISOString(), action: `Moved to ${s}` }],
                });
                setShowStages(false);
              }}
              style={{
                background: lead.stage === s ? colors[s] || "#666" : bgs[s] || "#F0F2F5",
                color: lead.stage === s ? "#fff" : colors[s] || "#666",
                border: "none",
                borderRadius: 7,
                padding: "5px 11px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #EEF0F2" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            {lead.phone && <a href={`tel:${lead.phone}`} style={{ color: C.green, fontSize: 14, textDecoration: "none", fontWeight: 600 }}>{lead.phone}</a>}
            {lead.email && <a href={`mailto:${lead.email}`} style={{ color: C.blue, fontSize: 14, textDecoration: "none", fontWeight: 600 }}>{lead.email}</a>}
            <span style={{ color: C.textMuted, fontSize: 12 }}>{lead.source}{lead.city ? ` | ${lead.city}` : ""}</span>
          </div>
          {lead.monetaryValue && <div style={{ fontSize: 13, color: C.green, fontWeight: 700, marginBottom: 8 }}>Deal: ${lead.monetaryValue}</div>}
          {lead.notes && <div style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.5, marginBottom: 10, background: "#F7F8FA", padding: "10px 12px", borderRadius: 8 }}>{lead.notes}</div>}
          {lead.commitments?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, marginBottom: 4 }}>COMMITMENTS</div>
              {lead.commitments.map((c, i) => <div key={i} style={{ fontSize: 12, color: C.text }}>- {c}</div>)}
            </div>
          )}
          {lead.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
              {lead.tags.map((t, i) => <span key={i} style={{ fontSize: 10, background: C.blueLight, color: C.blue, padding: "3px 8px", borderRadius: 5, fontWeight: 600 }}>{t}</span>)}
            </div>
          )}
          {lead.history?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>History</div>
              {lead.history.slice(-5).reverse().map((h, i) => (
                <div key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 3 }}>
                  <span style={{ color: C.textMuted }}>{fmtDate(h.date)}</span> {h.action}{h.note ? `: ${h.note}` : ""}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add note..."
              onClick={(e) => e.stopPropagation()}
              style={{ ...inputS, flex: 1, padding: "9px 12px", fontSize: 13 }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && noteText.trim()) {
                  onAddNote(lead.id, noteText.trim());
                  setNoteText("");
                }
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (noteText.trim()) {
                  onAddNote(lead.id, noteText.trim());
                  setNoteText("");
                }
              }}
              style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// TASK LIST
// ============================================
function TaskList({ tasks, onToggle, onDelete }) {
  const active = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div>
      {!active.length && !done.length && (
        <div style={{ ...cardS, textAlign: "center", padding: 30, color: C.textMuted }}>No tasks yet.</div>
      )}
      {active.map((t) => (
        <div
          key={t.id}
          style={{
            ...cardS,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "13px 16px",
            marginBottom: 6,
            borderLeft: t.priority === "high" ? `4px solid ${C.red}` : t.priority === "medium" ? `4px solid ${C.amber}` : "4px solid #D0D5DD",
          }}
        >
          <div
            onClick={() => onToggle(t.id)}
            style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1, border: "2.5px solid #D0D5DD", cursor: "pointer" }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontSize: 14, lineHeight: 1.4 }}>{t.text}</div>
            {t.linkedLead && <div style={{ fontSize: 11, color: C.blue, marginTop: 2, fontWeight: 600 }}>{t.linkedLead}</div>}
          </div>
          <span onClick={() => onDelete(t.id)} style={{ color: "#CCC", fontSize: 18, cursor: "pointer" }}>x</span>
        </div>
      ))}
      {done.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Done ({done.length})
          </div>
          {done.slice(0, 5).map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", opacity: 0.4, marginBottom: 3 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                ✓
              </div>
              <span style={{ fontSize: 13, color: C.textSecondary, textDecoration: "line-through" }}>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function Home() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState("copilot");
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestConvo, setLatestConvo] = useState(null);
  const [leadFilter, setLeadFilter] = useState("all");
  const [pipelineView, setPipelineView] = useState("sales");
  const [taskInput, setTaskInput] = useState("");

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  useEffect(() => {
    const h = (e) =>
      setState((p) => ({
        ...p,
        prospectingLog: [
          ...p.prospectingLog,
          { date: today(), type: e.detail.type, timestamp: new Date().toISOString() },
        ],
      }));
    window.addEventListener("tmb-log", h);
    return () => window.removeEventListener("tmb-log", h);
  }, []);

  const processVoiceDump = async (text) => {
    setIsProcessing(true);
    setLatestConvo(null);

    try {
      const aiText = await callAI(buildSystemPrompt(state), text);

      let extractedData = null;
      let cleanResponse = aiText;
      const jm = aiText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jm) {
        try {
          extractedData = JSON.parse(jm[1]);
          cleanResponse = aiText.replace(/```json\s*[\s\S]*?\s*```/, "").trim();
        } catch {}
      }

      const convo = {
        id: uid(),
        timestamp: new Date().toISOString(),
        date: today(),
        userMessage: text,
        aiResponse: cleanResponse,
        extractedData,
      };

      let nl = [...state.leads];
      let nt = [...state.tasks];
      let np = [...state.prospectingLog];

      if (extractedData?.extractedLead) {
        const el = extractedData.extractedLead;
        const exi = nl.findIndex(
          (l) => l.companyName.toLowerCase() === (el.companyName || "").toLowerCase()
        );

        if (exi >= 0 || extractedData.updateExisting) {
          const idx =
            exi >= 0
              ? exi
              : nl.findIndex((l) =>
                  l.companyName.toLowerCase().includes((el.companyName || "").toLowerCase())
                );
          if (idx >= 0) {
            nl[idx] = {
              ...nl[idx],
              ...(el.firstName && { firstName: el.firstName }),
              ...(el.lastName && { lastName: el.lastName }),
              ...(el.phone && { phone: el.phone }),
              ...(el.email && { email: el.email }),
              ...(el.temperature && { temperature: el.temperature }),
              ...(el.stage && { stage: el.stage }),
              ...(el.industry && { industry: el.industry }),
              ...(el.city && { city: el.city }),
              notes: el.notes || nl[idx].notes,
              commitments: el.commitments || nl[idx].commitments,
              tags: [...new Set([...(nl[idx].tags || []), ...(el.tags || [])])],
              lastContactAt: new Date().toISOString(),
              history: [
                ...(nl[idx].history || []),
                { date: new Date().toISOString(), action: "Updated via voice dump", note: el.notes },
              ],
            };
          }
        } else {
          nl.unshift(
            createGHLContact({
              firstName: el.firstName,
              lastName: el.lastName,
              companyName: el.companyName,
              phone: el.phone,
              email: el.email,
              city: el.city,
              state: el.state || "FL",
              industry: el.industry,
              temperature: el.temperature,
              stage: el.stage || "New Lead",
              source: el.source,
              notes: el.notes,
              commitments: el.commitments,
              tags: el.tags,
              monetaryValue: el.monetaryValue,
              lastContactAt: new Date().toISOString(),
              history: [{ date: new Date().toISOString(), action: "Created via voice dump", note: el.notes }],
            })
          );
        }
      }

      if (extractedData?.extractedTasks?.length) {
        extractedData.extractedTasks.forEach((t) =>
          nt.unshift({
            id: uid(),
            text: t.text,
            done: false,
            priority: t.priority || "medium",
            linkedLead: t.linkedLead || "",
            createdAt: new Date().toISOString(),
          })
        );
      }

      if (extractedData?.prospectingActivity) {
        np.push({
          date: today(),
          type: extractedData.prospectingActivity.type,
          timestamp: new Date().toISOString(),
        });
      }

      setState((p) => ({
        ...p,
        leads: nl,
        tasks: nt,
        prospectingLog: np,
        aiConversations: [...p.aiConversations, convo],
      }));
      setLatestConvo(convo);
    } catch (err) {
      setLatestConvo({
        id: uid(),
        timestamp: new Date().toISOString(),
        userMessage: text,
        aiResponse: `Error: ${err.message}. Make sure your ANTHROPIC_API_KEY is set in .env.local`,
      });
    }

    setIsProcessing(false);
  };

  const updateLead = (u) => setState((p) => ({ ...p, leads: p.leads.map((l) => (l.id === u.id ? u : l)) }));
  const addLeadNote = (lid, note) =>
    setState((p) => ({
      ...p,
      leads: p.leads.map((l) =>
        l.id === lid
          ? {
              ...l,
              notes: note,
              lastContactAt: new Date().toISOString(),
              history: [...(l.history || []), { date: new Date().toISOString(), action: "Note", note }],
            }
          : l
      ),
    }));

  if (!hydrated) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.textMuted, fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  const salesLeads = state.leads.filter((l) => l.pipeline === "sales" || !l.pipeline);
  const fulfillmentLeads = state.leads.filter((l) => l.pipeline === "fulfillment");
  const viewLeads = pipelineView === "sales" ? salesLeads : fulfillmentLeads;
  const filteredLeads = leadFilter === "all" ? viewLeads : viewLeads.filter((l) => l.stage === leadFilter);
  const activeLeads = salesLeads.filter((l) => l.stage !== "Closed Won" && l.stage !== "Closed Lost");
  const activeTasks = state.tasks.filter((t) => !t.done);
  const todayPros = state.prospectingLog.filter((p) => p.date === today()).length;
  const target = state.settings?.dailyTarget || 5;
  const callListContacts = state.callLists.reduce(
    (sum, l) => sum + l.contacts.filter((c) => c.status === "pending").length,
    0
  );

  const tabs = [
    { id: "copilot", label: "Co-Pilot" },
    { id: "dialer", label: "Dialer", count: callListContacts || undefined },
    { id: "pipeline", label: "Pipeline", count: activeLeads.length },
    { id: "tasks", label: "Tasks", count: activeTasks.length },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, maxWidth: 640, margin: "0 auto", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: C.card, padding: "14px 18px 0", borderBottom: "1px solid #E8ECF0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
              TMB <span style={{ color: C.green }}>Command</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
          <div
            style={{
              background: todayPros >= target ? C.greenLight : todayPros > 0 ? C.amberLight : C.redLight,
              padding: "5px 12px",
              borderRadius: 8,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: todayPros >= target ? C.green : todayPros > 0 ? "#B7791F" : C.red,
              }}
            >
              {todayPros}/{target}
            </span>
          </div>
        </div>
        <div style={{ display: "flex" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                background: "transparent",
                color: tab === t.id ? C.green : C.textMuted,
                border: "none",
                borderBottom: tab === t.id ? `3px solid ${C.green}` : "3px solid transparent",
                padding: "9px 4px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  style={{
                    marginLeft: 3,
                    fontSize: 10,
                    background: tab === t.id ? C.greenLight : "#F0F2F5",
                    color: tab === t.id ? C.green : C.textMuted,
                    padding: "1px 5px",
                    borderRadius: 5,
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 14px" }}>
        {tab === "copilot" && (
          <>
            <ProspectingRing count={todayPros} target={target} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                {
                  v: state.prospectingLog.filter((p) => p.date?.startsWith(new Date().toISOString().slice(0, 7))).length,
                  l: "This Month",
                  c: C.green,
                },
                {
                  v: salesLeads.filter((l) => l.stage === "Call Booked" || l.stage === "Proposal Sent").length,
                  l: "Hot",
                  c: C.amber,
                },
                { v: salesLeads.filter((l) => l.stage === "Closed Won").length, l: "Won", c: C.greenDark },
              ].map((s, i) => (
                <div key={i} style={{ ...cardS, textAlign: "center", padding: "14px 8px", marginBottom: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <OverdueAlerts leads={state.leads} />
            <QuickLog />
            <SalesPipelineBar leads={state.leads} />
            <VoiceDumpZone onSubmit={processVoiceDump} isProcessing={isProcessing} />
            {latestConvo && <AIResponse conversation={latestConvo} />}
            {state.aiConversations.length > 0 && !latestConvo && (
              <AIResponse conversation={state.aiConversations[state.aiConversations.length - 1]} />
            )}
          </>
        )}

        {tab === "dialer" && <ColdCallStation state={state} setState={setState} />}

        {tab === "pipeline" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {["sales", "fulfillment"].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPipelineView(p);
                    setLeadFilter("all");
                  }}
                  style={{
                    flex: 1,
                    background: pipelineView === p ? C.green : C.card,
                    color: pipelineView === p ? "#fff" : C.textSecondary,
                    border: "none",
                    borderRadius: 10,
                    padding: "10px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: pipelineView === p ? "none" : C.shadow,
                    textTransform: "capitalize",
                  }}
                >
                  {p} ({p === "sales" ? salesLeads.length : fulfillmentLeads.length})
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                onClick={() => setLeadFilter("all")}
                style={{
                  background: leadFilter === "all" ? C.blue : "#F0F2F5",
                  color: leadFilter === "all" ? "#fff" : C.textMuted,
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                All
              </button>
              {(pipelineView === "sales" ? SALES_STAGES : FULFILLMENT_STAGES).map((s) => {
                const ct = viewLeads.filter((l) => l.stage === s).length;
                if (!ct) return null;
                const sc = pipelineView === "sales" ? SALES_COLORS : FULFILLMENT_COLORS;
                return (
                  <button
                    key={s}
                    onClick={() => setLeadFilter(s)}
                    style={{
                      background: leadFilter === s ? sc[s] || "#666" : "#F0F2F5",
                      color: leadFilter === s ? "#fff" : sc[s] || "#666",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {s} ({ct})
                  </button>
                );
              })}
            </div>
            {filteredLeads.map((l) => (
              <LeadCard key={l.id} lead={l} onUpdate={updateLead} onAddNote={addLeadNote} />
            ))}
            {!filteredLeads.length && (
              <div style={{ ...cardS, textAlign: "center", padding: 30, color: C.textMuted }}>
                No leads in {pipelineView} pipeline.
              </div>
            )}
          </>
        )}

        {tab === "tasks" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Add task..."
                style={{ ...inputS, flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && taskInput.trim()) {
                    setState((p) => ({
                      ...p,
                      tasks: [
                        {
                          id: uid(),
                          text: taskInput.trim(),
                          done: false,
                          priority: "medium",
                          linkedLead: "",
                          createdAt: new Date().toISOString(),
                        },
                        ...p.tasks,
                      ],
                    }));
                    setTaskInput("");
                  }
                }}
              />
            </div>
            <TaskList
              tasks={state.tasks}
              onToggle={(id) =>
                setState((p) => ({
                  ...p,
                  tasks: p.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
                }))
              }
              onDelete={(id) =>
                setState((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== id) }))
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
