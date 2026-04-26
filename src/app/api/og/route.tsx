import { ImageResponse } from "next/og";

export const runtime = "edge";

const SITE_HOST = "career-compass-orpin-tau.vercel.app";

function clean(s: string | null, max = 80): string {
  if (!s) return "";
  return s.trim().slice(0, max);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const role = clean(url.searchParams.get("r"), 60);
  const seniority = clean(url.searchParams.get("l"), 30);
  const topSkillsRaw = clean(url.searchParams.get("t"), 200);
  const topSkills = topSkillsRaw
    ? topSkillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const hasContent = role.length > 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #6d28d9 70%, #be185d 100%)",
          color: "white",
          padding: "70px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Soft glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 400,
            height: 400,
            borderRadius: 9999,
            background: "rgba(244, 114, 182, 0.35)",
            filter: "blur(60px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -80,
            width: 360,
            height: 360,
            borderRadius: 9999,
            background: "rgba(99, 102, 241, 0.45)",
            filter: "blur(60px)",
            display: "flex",
          }}
        />

        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: -0.5,
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 40 }}>🧭</span>
          <span>CareerCompass</span>
          <span
            style={{
              marginLeft: 14,
              padding: "4px 12px",
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            5 FREE/DAY · India-aware
          </span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 2 }}>
          {hasContent ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.85, marginBottom: 12 }}>
                I just mapped my career →
              </div>
              <div
                style={{
                  fontSize: 76,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: -1.5,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span>{role}</span>
                {seniority && (
                  <span style={{ fontSize: 38, fontWeight: 700, opacity: 0.85, marginTop: 8 }}>
                    {seniority} · ready today
                  </span>
                )}
              </div>
              {topSkills.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
                  {topSkills.map((skill, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        padding: "10px 18px",
                        fontSize: 22,
                        fontWeight: 700,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.15)",
                        border: "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      {skill}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 86,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: -1.5,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span>Find the roles you</span>
                <span style={{ background: "linear-gradient(90deg,#fde68a,#fbbf24)", WebkitBackgroundClip: "text", color: "transparent" }}>
                  should actually
                </span>
                <span>apply for.</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 600, opacity: 0.85, marginTop: 22 }}>
                Paste your CV → personalised India-aware career map in 30s.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 2,
            fontSize: 22,
            opacity: 0.85,
          }}
        >
          <span>{SITE_HOST}</span>
          <span style={{ display: "flex", gap: 18 }}>
            <span>👻 Ghost Buster</span>
            <span>🧗 Skill Journey</span>
            <span>📬 Weekly Pulse</span>
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
