/**
 * Shared Open Graph artwork (1200×630): the product's own visual language —
 * navy field, offset accent blocks echoing the hero score tile, heavy
 * wordmark, one-line stance. No custom fonts: Satori renders system type,
 * which keeps the route dependency-free and statically optimizable.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_ALT = "Percevia AI — Accessibility operations, not one-click compliance";

export function OgArtwork() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0B1220",
        color: "#FFFFFF",
        padding: "72px 80px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
        <div
          style={{
            fontSize: 30,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          maitrico · Percevia AI
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1, marginTop: 24 }}>
          Accessibility operations,
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1, color: "#8FA8FF" }}>
          not one-click compliance.
        </div>
        <div style={{ fontSize: 28, marginTop: 32, color: "rgba(255,255,255,0.8)" }}>
          Scan · Understand · Remediate · Report
        </div>
      </div>
      <div style={{ position: "relative", width: 230, height: 230, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            left: 34,
            top: 34,
            width: 196,
            height: 196,
            background: "#5E4FD9",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 17,
            top: 17,
            width: 196,
            height: 196,
            background: "#3563E6",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 196,
            height: 196,
            background: "#0B1220",
            border: "3px solid #FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 64,
            fontWeight: 800,
            color: "#FFFFFF",
          }}
        >
          78
        </div>
      </div>
    </div>
  );
}
