import React from "react";

function Popup() {
  return (
    <div
      style={{
        width: 320,
        padding: 24,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
        <span style={{ fontSize: 16, fontWeight: 700 }}>RealityCheck</span>
      </div>

      <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
        AI Deepfake Detection for social media.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: "#1e293b",
          borderRadius: 8,
          fontSize: 12,
          color: "#94a3b8",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "#e2e8f0" }}>How to use:</strong>
        <br />
        Browse X (Twitter) and look for the{" "}
        <span style={{ color: "#e2e8f0" }}>magnifying glass</span> icon on images
        and videos in your feed. Click it to get an instant Reality Score.
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          color: "#475569",
          textAlign: "center",
        }}
      >
        v0.1.0 &middot; RealityCheck.com
      </div>
    </div>
  );
}

export default Popup;
