import { NextResponse } from "next/server";
import {
  LlmError,
  ghostDetectWithGemini,
  ghostDiagnoseWithGemini,
} from "@/lib/gemini";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { checkQuota, quotaBlockedResponse, recordUsage } from "@/lib/usage";

const MIN_JD_CHARS = 80;
const MAX_JD_CHARS = 12_000;
const MIN_CV_CHARS = 200;
const MAX_CV_CHARS = 35_000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GhostRequestBody {
  mode?: unknown;
  jd?: unknown;
  cv?: unknown;
}

export async function POST(req: Request) {
  const rl = await checkRateLimit(req, "ghost", RATE_LIMITS.ghost.max, RATE_LIMITS.ghost.window);
  if (!rl.success) return rateLimitResponse(rl);

  const quota = await checkQuota(req, "ghost");
  if (!quota.ok) return quotaBlockedResponse(quota);

  let payload: GhostRequestBody;
  try {
    payload = (await req.json()) as GhostRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = payload.mode === "diagnose" ? "diagnose" : "detect";
  const jd = typeof payload.jd === "string" ? payload.jd.trim() : "";
  const cv = typeof payload.cv === "string" ? payload.cv.trim() : "";

  if (jd.length < MIN_JD_CHARS) {
    return NextResponse.json(
      { error: `Paste at least ${MIN_JD_CHARS} characters of the job description.` },
      { status: 400 },
    );
  }
  if (jd.length > MAX_JD_CHARS) {
    return NextResponse.json(
      { error: `JD is too long. Trim it under ${MAX_JD_CHARS} characters.` },
      { status: 400 },
    );
  }

  if (mode === "diagnose") {
    if (cv.length < MIN_CV_CHARS) {
      return NextResponse.json(
        { error: `Paste at least ${MIN_CV_CHARS} characters of your CV.` },
        { status: 400 },
      );
    }
    if (cv.length > MAX_CV_CHARS) {
      return NextResponse.json(
        { error: `CV is too long. Trim it under ${MAX_CV_CHARS} characters.` },
        { status: 400 },
      );
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is not configured with an API key." },
      { status: 503 },
    );
  }

  try {
    if (mode === "detect") {
      const result = await ghostDetectWithGemini(jd, apiKey);
      void recordUsage(req, "ghost");
      return NextResponse.json({ mode, result });
    }
    const result = await ghostDiagnoseWithGemini(jd, cv, apiKey);
    void recordUsage(req, "ghost");
    return NextResponse.json({ mode, result });
  } catch (err) {
    if (err instanceof LlmError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("ghost API failed", err);
    return NextResponse.json(
      { error: "Something went wrong analysing the JD. Please try again." },
      { status: 500 },
    );
  }
}
