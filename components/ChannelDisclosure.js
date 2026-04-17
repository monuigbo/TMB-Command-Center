"use client";
// Per-channel expandable panel used inside ProspectingStation.
// One instance renders per channel in the strip. Only ONE is open at a time (controlled by parent).
// Phase 2: no changes needed — just pass enabled=true for liNote/fbMsg/email in ENABLED_CHANNELS.

import { useState } from "react";
import { CHANNELS, CHANNEL_OUTCOMES, POSITIVE_OUTCOME_IDS, buildLink, buildEmailLink } from "../lib/channels";
import { draftMessage } from "../lib/ai-draft";

const C = {
  text: "#1A2B3C", textSecondary: "#6B7C8D", textMuted: "#9DAAB7",
  green: "#4CAF50", greenLight: "#E8F5E9",
  amber: "#F5A623", amberLight: "#FFF8E1",
  red: "#E74C3C",
  card: "#FFFFFF", cardBorder: "#E8ECF0",
  shadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const inputS = {
  width: "100%", boxSizing: "border-box",
  background: "#F7F8FA", border: "1.5px solid #E2E6EA",
  borderRadius: 12, padding: "10px 14px",
  color: C.text, fontSize: 14,
  outline: "none", fontFamily: "inherit",
};

export default function ChannelDisclosure({
  channelId,
  contact,
  businessProfile,
  isOpen,
  onOpen,
  onLogOutcome, // (channelId, outcomeId, outcomeLabel, notes) => void
}) {
  const ch = CHANNELS[channelId];
  const outcomes = CHANNEL_OUTCOMES[channelId] || [];
  const touch = contact?.touches?.[channelId];

  const [drafting, setDrafting] = useState(false);
  const [draftText, setDraftText] = useState(contact?.drafts?.[channelId]?.text || "");
  const [draftSubject, setDraftSubject] = useState(contact?.drafts?.[channelId]?.subject || "");
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState("");

  const fieldValue = contact?.[ch.field] || "";
  const enabled = !!fieldValue;

  // Tint based on last touch outcome
  let tintColor = ch.color;
  let tintBg = ch.bg;
  if (touch?.lastOutcome) {
    const lastO = outcomes.find((o) => o.id === touch.lastOutcome);
    if (lastO) { tintColor = lastO.color; tintBg = lastO.bg; }
  }

  const handleDraft = async () => {
    setDrafting(true);
    try {
      const result = await draftMessage({ channelId, prospect: contact, businessProfile });
      setDraftText(result.text || "");
      if (result.subject) setDraftSubject(result.subject);
    } catch (e) {
      setDraftText("Error generating draft. Try again.");
    } finally {
      setDrafting(false);
    }
  };

  const handleCopy = () => {
    const fullText = draftSubject ? `Subject: ${draftSubject}\n\n${draftText}` : draftText;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenLink = () => {
    if (!draftText) return; // no draft yet — open only, don't copy
    // Copy the draft to clipboard synchronously in same gesture before navigating
    const fullText = draftSubject ? `Subject: ${draftSubject}\n\n${draftText}` : draftText;
    try { navigator.clipboard.writeText(fullText); } catch {}
  };

  const { href, canPrefill } = buildLink(channelId, contact || {});
  const emailHref = channelId === "email" && canPrefill
    ? buildEmailLink(contact, draftSubject, draftText)
    : href;
  const finalHref = channelId === "email" ? emailHref : href;

  // Icon button (in the channel strip)
  const iconBtn = (
    <button
      disabled={!enabled}
      onClick={() => enabled && onOpen(isOpen ? null : channelId)}
      style={{
        background: isOpen ? tintBg : enabled ? ch.bg : "#F0F2F5",
        color: isOpen ? tintColor : enabled ? ch.color : C.textMuted,
        border: `2px solid ${isOpen ? tintColor : enabled ? ch.color + "40" : "#E0E0E0"}`,
        borderRadius: 12, padding: "8px 0",
        fontSize: 13, fontWeight: 700,
        cursor: enabled ? "pointer" : "not-allowed",
        flex: 1,
        opacity: enabled ? 1 : 0.4,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      }}
    >
      <span style={{ fontSize: 18 }}>{ch.icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700 }}>{ch.label}</span>
      {touch?.count ? (
        <span style={{ fontSize: 9, background: tintColor, color: "#fff", borderRadius: 4, padding: "1px 5px" }}>
          {touch.count}×
        </span>
      ) : null}
    </button>
  );

  if (!isOpen) return iconBtn;

  return (
    <div>
      {iconBtn}
      <div style={{
        background: C.card, border: `1.5px solid ${ch.color}30`,
        borderRadius: 16, marginTop: 8, overflow: "hidden",
        boxShadow: C.shadow,
      }}>
        {/* Open link row */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #EEF0F2" }}>
          <a
            href={finalHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenLink}
            style={{
              display: "block", textAlign: "center",
              background: ch.color, color: "#fff",
              borderRadius: 12, padding: "13px 20px",
              textDecoration: "none", fontSize: 15, fontWeight: 700,
            }}
          >
            Open in {ch.label}
            {draftText && !ch.canPrefill ? " (message copied)" : ""}
          </a>
          {!enabled && (
            <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 8 }}>
              No {ch.label} handle for this contact
            </div>
          )}
        </div>

        {/* AI Draft section */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #EEF0F2" }}>
          {channelId === "email" && draftSubject ? (
            <input
              value={draftSubject}
              onChange={(e) => setDraftSubject(e.target.value)}
              placeholder="Subject line..."
              style={{ ...inputS, marginBottom: 8, fontSize: 13, fontWeight: 600 }}
            />
          ) : null}

          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder={drafting ? "Drafting…" : "Tap 'Draft with AI' to generate a message"}
            rows={channelId === "email" ? 6 : 4}
            style={{ ...inputS, resize: "vertical", fontSize: 13, lineHeight: 1.5 }}
            readOnly={drafting}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={handleDraft}
              disabled={drafting}
              style={{
                flex: 1, background: drafting ? "#F0F2F5" : "#1A2B3C",
                color: drafting ? C.textMuted : "#fff",
                border: "none", borderRadius: 10, padding: "10px",
                fontSize: 13, fontWeight: 700, cursor: drafting ? "default" : "pointer",
              }}
            >
              {drafting ? "Drafting…" : draftText ? "Regenerate" : "Draft with AI"}
            </button>
            {draftText && (
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? C.greenLight : "#F7F8FA",
                  color: copied ? C.green : C.textSecondary,
                  border: "1.5px solid " + (copied ? C.green + "40" : "#E2E6EA"),
                  borderRadius: 10, padding: "10px 16px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </div>
        </div>

        {/* Outcome logging */}
        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Log Outcome
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 10 }}>
            {outcomes.map((o) => (
              <button
                key={o.id}
                onClick={() => onLogOutcome(channelId, o.id, o.label, notes, o.promoteTo)}
                style={{
                  background: o.bg, color: o.color,
                  border: `1.5px solid ${o.color}30`,
                  borderRadius: 10, padding: "10px 8px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)…"
            rows={2}
            style={{ ...inputS, fontSize: 13, resize: "none" }}
          />
        </div>
      </div>
    </div>
  );
}
