import { ImageResponse } from "next/og";
import { getPlanBySlug } from "@/lib/plans";
import { DISTANCE_LABELS, LEVEL_LABELS } from "@/data/types";

export const alt = "anystride training plan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plan = getPlanBySlug(slug);
  const title = plan?.name ?? "Training plan";
  const meta = plan
    ? `${DISTANCE_LABELS[plan.distance]} · ${LEVEL_LABELS[plan.level]} · ${plan.durationWeeks} weeks`
    : "Free running training plan";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "#0b0d10",
          color: "#eef1f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>
            anystride
          </span>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#ff5a1f",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#ff6a33", fontWeight: 600 }}>
            Free training plan
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              marginTop: 16,
              maxWidth: 1000,
              letterSpacing: -2,
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ fontSize: 34, color: "#9aa4b2" }}>{meta}</div>
      </div>
    ),
    size,
  );
}
