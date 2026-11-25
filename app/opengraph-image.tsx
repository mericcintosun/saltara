import { ImageResponse } from "next/og";

export const alt = "Saltara: vertical jump height from a laptop webcam, with gravity as the ruler";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// IDENTITY.md palette (D12 orchard). ImageResponse cannot read CSS variables.
const C = { ground: "#f7f9f1", surface: "#edf2e2", ink: "#22301c", plum: "#7c3aa3", sun: "#e8b73a", line: "#cfdbbb" };

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: C.ground, padding: 64 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: C.surface,
            borderRadius: 48,
            padding: 64,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: C.plum, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: C.sun }} />
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, color: C.ink }}>Saltara</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: C.ink, lineHeight: 1.05 }}>Gravity is the only ruler you need</div>
            <div style={{ fontSize: 30, color: C.ink }}>
              Jump in front of a laptop camera and get your vertical jump in centimetres. No mat, no tape, no calibration.
            </div>
          </div>
          <div style={{ position: "absolute", right: 70, top: 150, width: 260, height: 260, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
            <div style={{ width: 260, height: 260, borderRadius: 130, border: `10px solid ${C.plum}`, borderBottomColor: "transparent", borderLeftColor: C.plum }} />
            <div style={{ position: "absolute", top: -14, width: 40, height: 40, borderRadius: 20, background: C.sun }} />
          </div>
          <div style={{ position: "absolute", left: 64, right: 64, bottom: 40, height: 8, borderRadius: 4, background: C.line }} />
        </div>
      </div>
    ),
    size
  );
}
