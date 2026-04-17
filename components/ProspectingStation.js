"use client";
// ProspectingStation — replaces ColdCallStation as the Prospecting tab.
// Multi-list, multi-channel (IG DM + Phone in v1; all 5 in phase 2).
// Phase 2 checklist (no structural changes needed):
//   [ ] Import ENABLED_CHANNELS from channels.js and change it to all 5
//   [ ] Wire businessProfile auto-learn from voice dumps into the businessProfile prop
//   [ ] Add list-picker search bar when lists.length >= 5

import { useState, useEffect } from "react";
import { CHANNELS, CHANNEL_ORDER, ENABLED_CHANNELS, CHANNEL_OUTCOMES, POSITIVE_OUTCOME_IDS } from "../lib/channels";
import { parseCsv, detectChannelsAvailable } from "../lib/csv-parser";
import { normalizeContact } from "../lib/channels";
import { promoteContactToLead } from "../lib/promote";
import ChannelDisclosure from "./ChannelDisclosure";

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function today() { return new Date().toISOString().split("T")[0]; }
function fmtDate(d) { if (!d) return ""; return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

const C = {
  bg: "#F0F2F5", card: "#FFFFFF", cardBorder: "#E8ECF0",
  text: "#1A2B3C", textSecondary: "#6B7C8D", textMuted: "#9DAAB7",
  green: "#4CAF50", greenLight: "#E8F5E9", greenDark: "#2E7D32",
  amber: "#F5A623", amberLight: "#FFF8E1",
  red: "#E74C3C", redLight: "#FFEBEE",
  blue: "#5B6AD0",
  shadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const cardS = {
  background: C.card, borderRadius: 16, padding: "18px 20px",
  boxShadow: C.shadow, marginBottom: 14, border: `1px solid ${C.cardBorder}`,
};

const inputS = {
  width: "100%", boxSizing: "border-box",
  background: "#F7F8FA", border: "1.5px solid #E2E6EA",
  borderRadius: 12, padding: "12px 16px",
  color: C.text, fontSize: 15, outline: "none", fontFamily: "inherit",
};

const INDUSTRIES = [
  "Contractor", "Plumber", "HVAC", "Electrician", "Roofer", "Landscaper",
  "Painter", "Pool Service", "Pest Control", "Cleaning", "Tree Service",
  "Garage Door", "Fencing", "Flooring", "Handyman", "MedSpa",
  "Chiropractor", "Tattoo Studio", "Other",
];

// ---- Import flow ----
function ImportFlow({ onImport, onCancel }) {
  const [csvText, setCsvText] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [source, setSource] = useState("sheet"); // "sheet" | "paste"
  const [listName, setListName] = useState("");
  const [niche, setNiche] = useState("Contractor");
  const [emoji, setEmoji] = useState("");
  const [listNotes, setListNotes] = useState("");
  const [step, setStep] = useState("form"); // "form" | "confirm"
  const [parsed, setParsed] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const handleParse = async () => {
    if (!listName.trim()) return;
    setFetchError("");

    if (source === "paste") {
      if (!csvText.trim()) return;
      setParsed(parseCsv(csvText));
      setStep("confirm");
      return;
    }

    // source === "sheet"
    if (!sheetUrl.trim()) return;
    setFetching(true);
    try {
      const res = await fetch("/api/fetch-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || "Failed to fetch sheet.");
        setFetching(false);
        return;
      }
      setParsed(parseCsv(data.csv));
      setStep("confirm");
    } catch (e) {
      setFetchError("Network error — check your connection and try again.");
    } finally {
      setFetching(false);
    }
  };

  const handleConfirm = () => {
    if (!parsed) return;
    const contacts = parsed.rows.map((c) => normalizeContact({ ...c, industry: c.industry || niche }));
    const newList = {
      id: uid(),
      name: listName.trim(),
      niche: niche,
      emoji: emoji.trim() || "",
      notes: listNotes.trim(),
      industry: niche,
      contacts,
      lastCursor: null,
      archivedAt: null,
      createdAt: new Date().toISOString(),
    };
    onImport(newList);
  };

  if (step === "confirm" && parsed) {
    return (
      <div style={cardS}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          Confirm Import
        </div>
        <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8 }}>
          <strong>{parsed.rows.length}</strong> contacts ready
          {parsed.skipped.length > 0 ? `, ${parsed.skipped.length} skipped` : ""}
          {parsed.isLegacyMode ? " (legacy 4-col mode)" : ""}
        </div>

        {Object.keys(parsed.headerMap).length > 0 && (
          <div style={{ background: "#F7F8FA", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: "uppercase" }}>
              Column Mapping
            </div>
            {Object.entries(parsed.headerMap).map(([field, raw]) => (
              <div key={field} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 2 }}>
                "{raw}" → <strong>{field}</strong>
              </div>
            ))}
          </div>
        )}

        {parsed.rows.slice(0, 3).map((r, i) => (
          <div key={i} style={{ fontSize: 12, color: C.textMuted, borderBottom: "1px solid #F0F2F5", padding: "4px 0" }}>
            {r.companyName || "(unnamed)"}{r.instagramHandle ? ` · @${r.instagramHandle}` : ""}{r.phone ? ` · ${r.phone}` : ""}
          </div>
        ))}
        {parsed.rows.length > 3 && (
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>…and {parsed.rows.length - 3} more</div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={handleConfirm} style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Import List
          </button>
          <button onClick={() => setStep("form")} style={{ background: "#F0F2F5", color: C.textSecondary, border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={cardS}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Import Prospect List</div>

      <input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="List name (e.g. Tampa Plumbers Apr)" style={{ ...inputS, marginBottom: 8 }} />

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={niche} onChange={(e) => setNiche(e.target.value)} style={{ ...inputS, flex: 1, cursor: "pointer" }}>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🔧" maxLength={2} style={{ ...inputS, width: 60, textAlign: "center", fontSize: 20 }} />
      </div>

      <input value={listNotes} onChange={(e) => setListNotes(e.target.value)} placeholder="Notes about this list (optional)" style={{ ...inputS, marginBottom: 12 }} />

      {/* Source tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, background: "#F0F2F5", borderRadius: 10, padding: 4 }}>
        {[
          { id: "sheet", label: "Google Sheets URL" },
          { id: "paste", label: "Paste CSV" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setSource(tab.id); setFetchError(""); }}
            style={{
              flex: 1, padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              background: source === tab.id ? "#fff" : "transparent",
              color: source === tab.id ? C.text : C.textMuted,
              boxShadow: source === tab.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {source === "sheet" ? (
        <>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
            Paste a Google Sheets link. Set sharing to <strong>"Anyone with the link — Viewer"</strong> first.
          </div>
          <input
            value={sheetUrl}
            onChange={(e) => { setSheetUrl(e.target.value); setFetchError(""); }}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            style={{ ...inputS, fontSize: 13, marginBottom: 8 }}
          />
          {fetchError && (
            <div style={{ background: C.redLight, color: C.red, padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 8 }}>
              {fetchError}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
            Paste CSV — first row = headers (business_name, instagram, linkedin, phone, email, city, industry, etc.)
          </div>
          <textarea
            value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={5}
            placeholder={"Business Name,Instagram,Phone,Email\nABC Plumbing,@abcplumbing,8135550101,mike@abc.com"}
            style={{ ...inputS, fontFamily: "monospace", fontSize: 12, resize: "vertical", marginBottom: 8 }}
          />
        </>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleParse}
          disabled={fetching || !listName.trim() || (source === "sheet" ? !sheetUrl.trim() : !csvText.trim())}
          style={{
            background: C.green, color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 22px", fontSize: 14, fontWeight: 700,
            cursor: fetching ? "wait" : "pointer", opacity: fetching ? 0.7 : 1,
          }}>
          {fetching ? "Fetching…" : "Preview →"}
        </button>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---- List picker bottom sheet ----
function ListPicker({ lists, activeListId, onSelect, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.4)" }} />
      <div style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", maxHeight: "70vh", overflowY: "auto" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Switch Prospect List</div>
        {lists.filter((l) => !l.archivedAt).map((list) => {
          const pending = list.contacts.filter((c) => c.status === "pending").length;
          const touched = list.contacts.filter((c) => c.status !== "pending").length;
          const isActive = list.id === activeListId;
          return (
            <div
              key={list.id}
              onClick={() => { onSelect(list.id); onClose(); }}
              style={{
                padding: "12px 14px", borderRadius: 12, marginBottom: 8, cursor: "pointer",
                background: isActive ? C.greenLight : "#F7F8FA",
                border: `1.5px solid ${isActive ? C.green + "40" : "#E2E6EA"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {list.emoji && <span style={{ fontSize: 20 }}>{list.emoji}</span>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{list.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {list.niche || list.industry} · {touched}/{list.contacts.length} touched · {pending} left
                  </div>
                </div>
                {isActive && <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>Active</span>}
              </div>
            </div>
          );
        })}
        {lists.filter((l) => !l.archivedAt).length === 0 && (
          <div style={{ color: C.textMuted, fontSize: 14, textAlign: "center", padding: 20 }}>No active lists</div>
        )}
      </div>
    </div>
  );
}

// ---- Manage Lists panel ----
function ManageLists({ lists, onRename, onArchive, onDelete, onExportGHL }) {
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const visible = lists.filter((l) => showArchived ? l.archivedAt : !l.archivedAt);

  return (
    <div style={cardS}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Manage Lists</div>
        <button onClick={() => setShowArchived(!showArchived)} style={{ fontSize: 12, color: C.blue, background: "none", border: "none", cursor: "pointer" }}>
          {showArchived ? "Show Active" : "Show Archived"}
        </button>
      </div>

      {visible.map((list) => {
        const pending = list.contacts.filter((c) => c.status === "pending").length;
        const interested = list.contacts.filter((c) => {
          const touches = Object.values(c.touches || {});
          return touches.some((t) => POSITIVE_OUTCOME_IDS.has(t.lastOutcome));
        }).length;

        return (
          <div key={list.id} style={{ borderBottom: "1px solid #F0F2F5", paddingBottom: 12, marginBottom: 12 }}>
            {editId === list.id ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...inputS, flex: 1, padding: "8px 12px", fontSize: 13 }} />
                <button onClick={() => { onRename(list.id, editName); setEditId(null); }}
                  style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditId(null)} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                    {list.emoji} {list.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {list.niche || list.industry} · {list.contacts.length} contacts · {pending} left · {interested} positive
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setEditId(list.id); setEditName(list.name); }}
                    style={{ fontSize: 11, background: "#F0F2F5", color: C.textSecondary, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => onArchive(list.id, !list.archivedAt)}
                    style={{ fontSize: 11, background: list.archivedAt ? C.greenLight : "#FFF8E1", color: list.archivedAt ? C.green : C.amber, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                    {list.archivedAt ? "Restore" : "Archive"}
                  </button>
                  <button onClick={() => onExportGHL(list.id)}
                    style={{ fontSize: 11, background: "#F0F2F5", color: C.textSecondary, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>GHL</button>
                  <button onClick={() => { if (window.confirm("Delete this list?")) onDelete(list.id); }}
                    style={{ fontSize: 11, background: "#FFEBEE", color: C.red, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>Del</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {visible.length === 0 && (
        <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: "10px 0" }}>
          {showArchived ? "No archived lists" : "No active lists"}
        </div>
      )}
    </div>
  );
}

// ---- Main component ----
export default function ProspectingStation({ state, setState, businessProfile = {} }) {
  const lists = state.callLists; // callLists IS the prospect lists — UI term only

  const [activeListId, setActiveListId] = useState(() => {
    const first = lists.find((l) => !l.archivedAt);
    return first?.id || null;
  });
  const [inSession, setInSession] = useState(false);
  const [openChannel, setOpenChannel] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const activeList = lists.find((l) => l.id === activeListId) || null;

  // Resolve current contact from lastCursor or first pending
  const pendingContacts = activeList?.contacts.filter((c) => c.status === "pending") || [];
  const cursorContactId = activeList?.lastCursor?.contactId;
  const cursorChannel = activeList?.lastCursor?.channel || "phone";
  const currentContact = cursorContactId
    ? pendingContacts.find((c) => c.id === cursorContactId) || pendingContacts[0] || null
    : pendingContacts[0] || null;

  const todayTouches = state.prospectingLog.filter((p) => p.date === today()).length;
  const target = state.settings?.dailyTarget || 5;

  // Update a list in state
  const updateList = (listId, updater) => {
    setState((prev) => ({
      ...prev,
      callLists: prev.callLists.map((l) => l.id === listId ? updater(l) : l),
    }));
  };

  // Save cursor when channel opens
  useEffect(() => {
    if (!inSession || !activeListId || !currentContact) return;
    updateList(activeListId, (l) => ({
      ...l,
      lastCursor: { contactId: currentContact.id, channel: openChannel || cursorChannel },
    }));
  }, [openChannel, currentContact?.id, inSession]);

  const handleImport = (newList) => {
    setState((prev) => ({ ...prev, callLists: [...prev.callLists, newList] }));
    setActiveListId(newList.id);
    setShowImport(false);
  };

  const handleLogOutcome = (channelId, outcomeId, outcomeLabel, notes, promoteTo) => {
    if (!currentContact || !activeList) return;
    const ch = CHANNELS[channelId];

    // Update contact touches + status
    const updatedContact = {
      ...currentContact,
      status: POSITIVE_OUTCOME_IDS.has(outcomeId) && promoteTo ? "promoted" : "called",
      touches: {
        ...(currentContact.touches || {}),
        [channelId]: {
          lastAt: new Date().toISOString(),
          lastOutcome: outcomeId,
          count: ((currentContact.touches || {})[channelId]?.count || 0) + 1,
        },
      },
    };

    // Prospecting log entry
    const logEntry = {
      id: uid(),
      date: today(),
      type: ch.logType,
      timestamp: new Date().toISOString(),
      listId: activeList.id,
      contactId: currentContact.id,
      outcome: outcomeId,
      notes: notes || "",
    };

    // Promote to lead if positive outcome + promoteTo stage defined
    let newLeads = [...state.leads];
    if (promoteTo) {
      const { lead } = promoteContactToLead(
        currentContact, channelId, outcomeLabel, promoteTo,
        state.leads, activeList.name, ch.logType, notes
      );
      if (lead) newLeads = [lead, ...newLeads];
    }

    // Find next pending contact
    const remaining = activeList.contacts
      .filter((c) => c.id !== currentContact.id && c.status === "pending");
    const nextContact = remaining[0] || null;

    setState((prev) => ({
      ...prev,
      leads: newLeads,
      prospectingLog: [...prev.prospectingLog, logEntry],
      callLists: prev.callLists.map((l) => {
        if (l.id !== activeList.id) return l;
        return {
          ...l,
          lastCursor: nextContact ? { contactId: nextContact.id, channel: openChannel } : null,
          contacts: l.contacts.map((c) => c.id === currentContact.id ? updatedContact : c),
        };
      }),
    }));

    setOpenChannel(null);
  };

  const handleSkip = () => {
    if (!currentContact || !activeList) return;
    const idx = pendingContacts.indexOf(currentContact);
    const next = pendingContacts[idx + 1] || null;
    updateList(activeListId, (l) => ({
      ...l,
      lastCursor: next ? { contactId: next.id, channel: null } : null,
    }));
    setOpenChannel(null);
  };

  const handleNext = () => {
    if (!currentContact || !activeList) return;
    // Move current contact to end of pending (re-queue)
    const idx = pendingContacts.indexOf(currentContact);
    const next = pendingContacts[idx + 1] || null;
    updateList(activeListId, (l) => ({
      ...l,
      lastCursor: next ? { contactId: next.id, channel: null } : null,
    }));
    setOpenChannel(null);
  };

  const exportGHL = (listId) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    const headers = "firstName,lastName,companyName,phone,email,source,tags,industry,notes";
    const rows = list.contacts
      .filter((c) => {
        const touches = Object.values(c.touches || {});
        return touches.some((t) => POSITIVE_OUTCOME_IDS.has(t.lastOutcome));
      })
      .map((c) => {
        const touchTypes = Object.entries(c.touches || {})
          .filter(([, t]) => POSITIVE_OUTCOME_IDS.has(t.lastOutcome))
          .map(([ch]) => ch).join("-");
        return `"${c.firstName}","${c.lastName}","${c.companyName}","${c.phone}","${c.email}","Prospecting","${touchTypes}","${c.industry}","${(c.notes || "").replace(/"/g, '""')}"`;
      });
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ghl-${list.name.replace(/\s+/g, "-")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ---- VIEWS ----

  // View: no lists yet
  if (lists.filter((l) => !l.archivedAt).length === 0 && !showImport) {
    return (
      <div>
        <div style={{ ...cardS, textAlign: "center", padding: 30, color: C.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>No prospect lists yet</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>Import a CSV to start prospecting</div>
          <button onClick={() => setShowImport(true)}
            style={{ background: C.green, color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            + Import List
          </button>
        </div>
      </div>
    );
  }

  if (showImport) {
    return <ImportFlow onImport={handleImport} onCancel={() => setShowImport(false)} />;
  }

  // View: not in session — list overview
  if (!inSession) {
    const pending = activeList?.contacts.filter((c) => c.status === "pending").length || 0;
    const total = activeList?.contacts.length || 0;
    const touched = total - pending;

    return (
      <div>
        {/* Session stats strip */}
        <div style={{ ...cardS, display: "flex", justifyContent: "space-around", textAlign: "center", padding: "14px 20px" }}>
          {[
            { v: todayTouches, l: "Today", c: C.green },
            { v: pending, l: "Left in List", c: C.amber },
            { v: touched, l: "Touched", c: C.blue },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Active list switcher card */}
        {activeList && (
          <div style={{ ...cardS, cursor: "pointer" }} onClick={() => setShowPicker(true)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              {activeList.emoji && <span style={{ fontSize: 24 }}>{activeList.emoji}</span>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{activeList.name}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{activeList.niche || activeList.industry}</div>
              </div>
              <div style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>Switch ›</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: C.textMuted }}>{touched}/{total} touched · {pending} remaining</div>
              <div style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>
                {total > 0 ? Math.round((touched / total) * 100) : 0}%
              </div>
            </div>
            <div style={{ height: 6, background: "#EEF0F2", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${total > 0 ? (touched / total) * 100 : 0}%`, height: "100%", background: C.green, borderRadius: 4 }} />
            </div>
          </div>
        )}

        {/* Primary CTA */}
        {activeList && pending > 0 && (
          <button
            onClick={() => setInSession(true)}
            style={{ width: "100%", background: C.green, color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 14, boxShadow: "0 4px 12px rgba(76,175,80,0.3)" }}
          >
            {activeList.lastCursor ? `Resume Prospecting (${pending} left)` : `Start Prospecting (${pending} contacts)`}
          </button>
        )}

        {activeList && pending === 0 && (
          <div style={{ ...cardS, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.green, marginBottom: 6 }}>List Complete! 🎉</div>
            <div style={{ fontSize: 13, color: C.textSecondary }}>Import a new list or switch niches to keep going.</div>
          </div>
        )}

        {/* Import button */}
        <button onClick={() => setShowImport(true)}
          style={{ width: "100%", background: C.card, border: "2px dashed #D0D5DD", borderRadius: 14, padding: 14, color: C.green, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>
          + Import New List
        </button>

        {/* Manage lists toggle */}
        <button onClick={() => setShowManage(!showManage)}
          style={{ width: "100%", background: "none", border: "none", color: C.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
          {showManage ? "▲ Hide Manage Lists" : "▼ Manage Lists"}
        </button>

        {showManage && (
          <ManageLists
            lists={lists}
            onRename={(id, name) => updateList(id, (l) => ({ ...l, name }))}
            onArchive={(id, archive) => updateList(id, (l) => ({ ...l, archivedAt: archive ? new Date().toISOString() : null }))}
            onDelete={(id) => setState((prev) => ({ ...prev, callLists: prev.callLists.filter((l) => l.id !== id) }))}
            onExportGHL={exportGHL}
          />
        )}

        {showPicker && (
          <ListPicker
            lists={lists}
            activeListId={activeListId}
            onSelect={(id) => { setActiveListId(id); setOpenChannel(null); }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    );
  }

  // View: active prospecting session
  const availableChannels = currentContact ? detectChannelsAvailable(currentContact) : [];
  const pending = activeList?.contacts.filter((c) => c.status === "pending").length || 0;
  const total = activeList?.contacts.length || 0;
  const touched = total - pending;

  return (
    <div>
      {/* Session header */}
      <div style={{ ...cardS, background: "#F0FFF4", border: `1.5px solid ${C.green}40`, padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setShowPicker(true)}
            style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.greenDark }}>
              {activeList?.emoji} {activeList?.name}
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{touched}/{total} touched · {pending} left · tap to switch</div>
          </button>
          <button
            onClick={() => setInSession(false)}
            style={{ background: "#fff", color: C.red, border: `1.5px solid ${C.red}30`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            End
          </button>
        </div>
      </div>

      {currentContact ? (
        <>
          {/* Prospect card */}
          <div style={{ ...cardS, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                {touched + 1} of {total}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>{currentContact.companyName}</div>
              {(currentContact.firstName || currentContact.lastName) && (
                <div style={{ fontSize: 14, color: C.textSecondary, marginBottom: 4 }}>
                  {currentContact.firstName} {currentContact.lastName}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {currentContact.industry && (
                  <span style={{ fontSize: 11, background: "#FFF8E1", color: "#B7791F", padding: "3px 10px", borderRadius: 6, fontWeight: 600 }}>
                    {currentContact.industry}
                  </span>
                )}
                {currentContact.city && (
                  <span style={{ fontSize: 11, background: "#F0F2F5", color: C.textSecondary, padding: "3px 10px", borderRadius: 6, fontWeight: 600 }}>
                    {currentContact.city}{currentContact.state ? `, ${currentContact.state}` : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Channel strip */}
            <div style={{ padding: "0 16px 16px", display: "flex", gap: 7 }}>
              {CHANNEL_ORDER.filter((id) => ENABLED_CHANNELS.includes(id)).map((id) => (
                <ChannelDisclosure
                  key={id}
                  channelId={id}
                  contact={currentContact}
                  businessProfile={businessProfile}
                  isOpen={openChannel === id}
                  onOpen={setOpenChannel}
                  onLogOutcome={handleLogOutcome}
                />
              ))}
            </div>

            {/* Skip / Next footer */}
            <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
              <button onClick={handleSkip}
                style={{ flex: 1, background: "#F7F8FA", color: C.textMuted, border: "1px solid #E2E6EA", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Skip
              </button>
              <button onClick={handleNext}
                style={{ flex: 2, background: C.text, color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Next Contact →
              </button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ ...cardS, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.green, marginBottom: 8 }}>List Complete! 🎉</div>
          <div style={{ color: C.textSecondary, marginBottom: 16 }}>
            {touched} contacts touched today
          </div>
          <button onClick={() => setInSession(false)}
            style={{ background: C.green, color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Done
          </button>
        </div>
      )}

      {showPicker && (
        <ListPicker
          lists={lists}
          activeListId={activeListId}
          onSelect={(id) => { setActiveListId(id); setOpenChannel(null); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
