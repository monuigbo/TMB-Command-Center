"use client";
import { useState } from "react";

const C = {
  bg: "#F0F2F5",
  card: "#FFFFFF",
  text: "#1A2B3C",
  textMuted: "#9DAAB7",
  green: "#4CAF50",
  red: "#E74C3C",
  redLight: "#FFEBEE",
};

export default function LoginScreen({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await onSignIn(email, password);
      if (result?.error) {
        setError(result.error.message || "Sign in failed");
      }
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>
            TMB <span style={{ color: C.green }}>Command</span>
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>Sign in to sync across devices</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid #E8ECF0",
                borderRadius: 10,
                fontSize: 15,
                color: C.text,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid #E8ECF0",
                borderRadius: 10,
                fontSize: 15,
                color: C.text,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ background: C.redLight, color: C.red, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 0",
              background: loading ? C.textMuted : C.green,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
