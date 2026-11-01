import { ImageResponse } from "next/og";

export const alt = "Anystride — training plans and coaching for runners";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#181818",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
            anystride
          </span>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#ff5a1f",
            }}
          />
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.05,
            marginTop: 28,
            maxWidth: 900,
            letterSpacing: -2,
          }}
        >
          Training plans and coaching for runners.
        </div>
        <div style={{ fontSize: 32, color: "#9b9b9b", marginTop: 28 }}>
          Free training plans · Find a coach · Tools for coaches
        </div>
      </div>
    ),
    size,
  );
}
