import { NextResponse } from "next/server";
import { LlmError, polishResumeWithGemini } from "@/lib/gemini";
import { getServerSupabase, getAdminSupabase } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { checkQuota, quotaBlockedResponse, recordUsage } from "@/lib/usage";

const MIN_RESUME_CHARS = 200;
const MAX_RESUME_CHARS = 35_000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PolishRequestBody {
  resume?: unknown;
  name?: unknown;
}

export async function POST(req: Request) {
  const rl = await checkRateLimit(req, "studio", RATE_LIMITS.studio.max, RATE_LIMITS.studio.window);
  if (!rl.success) return rateLimitResponse(rl);

  const quota = await checkQuota(req, "studio");
  if (!quota.ok) return quotaBlockedResponse(quota);

  let payload: PolishRequestBody;
  try {
    payload = (await req.json()) as PolishRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const resume = typeof payload.resume === "string" ? payload.resume.trim() : "";
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : null;

  if (resume.length < MIN_RESUME_CHARS) {
    return NextResponse.json(
      { error: `Paste at least ${MIN_RESUME_CHARS} characters of your CV.` },
      { status: 400 },
    );
  }
  if (resume.length > MAX_RESUME_CHARS) {
    return NextResponse.json(
      { error: `CV is too long. Trim it under ${MAX_RESUME_CHARS} characters.` },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 503 });
  }

  try {
    const result = await polishResumeWithGemini(resume, apiKey);
    void recordUsage(req, "studio");
    void saveVersion({ mode: "polish", name, originalText: resume, jdText: null, output: result, atsScore: result.ats_score?.overall ?? null });
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof LlmError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Unexpected /api/studio/polish error", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

async function saveVersion(args: {
  mode: "polish" | "tailor";
  name: string | null;
  originalText: string;
  jdText: string | null;
  output: unknown;
  atsScore: number | null;
}) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    let userId: string | null = null;
    try {
      const supa = await getServerSupabase();
      const { data } = await supa.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      /* anon */
    }
    if (!userId) return; // only persist for signed-in users
    const admin = getAdminSupabase();
    await admin.from("studio_versions").insert({
      user_id: userId,
      mode: args.mode,
      name: args.name,
      original_text: args.originalText,
      jd_text: args.jdText,
      output: args.output,
      ats_score: args.atsScore,
    });
  } catch (e) {
    console.error("saveVersion failed (non-fatal)", e);
  }
}
