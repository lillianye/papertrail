import React from "react";
import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  const handleOpenJournal = () => {
    navigate("/calendar");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f6f7fb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      {/* Journal Cover */}
      <div
        style={{
          width: "420px",
          minHeight: "560px",
          padding: "3rem 2.5rem",
          backgroundColor: "#1e3a5f", // Dark blue journal cover
          borderRadius: "16px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)",
        }}
      >
        {/* Decorative texture overlay for journal feel */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.02) 0%, transparent 50%)",
            borderRadius: "16px",
            pointerEvents: "none",
          }}
        />

        {/* Top section with title */}
        <div style={{ width: "100%", marginTop: "2rem" }}>
          <h1
            style={{
              fontSize: "3.5rem",
              fontWeight: "600",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              color: "#d4af37", // Gold color
              marginBottom: "0.5rem",
              letterSpacing: "0.05em",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            PaperTrail
          </h1>
          
          {/* Gold decorative line */}
          <div
            style={{
              width: "280px",
              height: "2px",
              backgroundColor: "#d4af37",
              margin: "0 auto 1.5rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          />

          {/* Tagline - moved closer to title */}
          <p
            style={{
              fontSize: "1.25rem",
              fontWeight: "400",
              fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
              color: "#e8e8e8", // Light grey/white
              lineHeight: "1.6",
              margin: "0 auto 3rem",
              maxWidth: "320px",
            }}
          >
            A private space for your thoughts and feelings. Unorganized, candid, personal.
          </p>
        </div>

        {/* Spacer section for button positioning */}
        <div style={{ flex: "0.6", minHeight: "2rem" }} />

        {/* Bottom section with button */}
        <div style={{ width: "100%", marginBottom: "1.25rem", marginTop: "-1.5rem" }}>
          <button
            onClick={handleOpenJournal}
            style={{
              padding: "0.9rem 2.5rem",
              fontSize: "1.1rem",
              fontWeight: "600",
              fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
              borderRadius: "10px",
              cursor: "pointer",
              backgroundColor: "#5b6cff", // Purple-blue matching app theme
              color: "white",
              border: "none",
              boxShadow: "0 4px 16px rgba(91, 108, 255, 0.3), 0 2px 8px rgba(0,0,0,0.15)",
              transition: "all 0.3s ease",
              display: "inline-block",
              width: "auto",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(91, 108, 255, 0.4), 0 4px 12px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(91, 108, 255, 0.3), 0 2px 8px rgba(0,0,0,0.15)";
            }}
          >
            Open Journal
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
