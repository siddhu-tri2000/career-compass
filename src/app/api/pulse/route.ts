import { NextResponse } from "next/server";
import { LlmError, pulseInsightWithGemini } from "@/lib/gemini";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import type { PulseInsight } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CachedPulse {
  date: string;
  payload: PulseInsight;
  expiresAt: number;
}

// In-memory cache. Key = `${date}:${profileHash}`. Per warm Lambda only — that's fine,
// even cold cache costs us 1 cheap Gemini call per warm-up.
const CACHE = new Map<string, CachedPulse>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashProfile(p: ProfileInput | null): string {
  if (!p) return "anon";
  const parts = [
    p.seniority ?? "",
    p.industry ?? "",
    p.location ?? "",
    (p.top_skills ?? []).slice(0, 6).sort().join(","),
  ];
  return parts.join("|").toLowerCase();
}

interface ProfileInput {
  seniority?: string;
  industry?: string;
  location?: string;
  top_skills?: string[];
}

function sanitiseProfile(input: unknown): ProfileInput | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const out: ProfileInput = {};
  if (typeof obj.seniority === "string") out.seniority = obj.seniority.slice(0, 60);
  if (typeof obj.industry === "string") out.industry = obj.industry.slice(0, 60);
  if (typeof obj.location === "string") out.location = obj.location.slice(0, 60);
  if (Array.isArray(obj.top_skills)) {
    out.top_skills = obj.top_skills
      .filter((s): s is string => typeof s === "string")
      .slice(0, 10)
      .map((s) => s.slice(0, 40));
  }
  if (!out.seniority && !out.industry && !out.location && !out.top_skills?.length) return null;
  return out;
}

export async function POST(req: Request) {
  const rl = await checkRateLimit(req, "pulse", RATE_LIMITS.pulse.max, RATE_LIMITS.pulse.window);
  if (!rl.success) return rateLimitResponse(rl);

  let body: { profile?: unknown } = {};
  try {
    body = (await req.json()) as { profile?: unknown };
  } catch {
    // empty body is fine — anon pulse
  }

  const profile = sanitiseProfile(body.profile);
  const date = todayISO();
  const key = `${date}:${hashProfile(profile)}`;

  const cached = CACHE.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ insight: cached.payload, cached: true, date });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is not configured with an API key." },
      { status: 503 },
    );
  }

  try {
    const insight = await pulseInsightWithGemini(profile, apiKey);
    CACHE.set(key, { date, payload: insight, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ insight, cached: false, date });
  } catch (err) {
    if (err instanceof LlmError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("pulse API failed", err);
    return NextResponse.json(
      { error: "Could not generate today's pulse. Please try again." },
      { status: 500 },
    );
  }
}
