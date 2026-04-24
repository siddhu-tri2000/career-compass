import { NextResponse } from "next/server";
import { LlmError, matchRolesWithGemini } from "@/lib/gemini";
import { getServerSupabase, getAdminSupabase } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

const MIN_RESUME_CHARS = 200;
const MAX_RESUME_CHARS = 35_000;
const MAX_TARGET_ROLE_CHARS = 100;
const MAX_LOCATION_CHARS = 60;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MatchRequestBody {
  resume?: unknown;
  target_role?: unknown;
  location?: unknown;
}

export async function POST(req: Request) {
  const rl = await checkRateLimit(req, "match", RATE_LIMITS.match.max, RATE_LIMITS.match.window);
  if (!rl.success) return rateLimitResponse(rl);

  let payload: MatchRequestBody;
  try {
    payload = (await req.json()) as MatchRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const resume = typeof payload.resume === "string" ? payload.resume.trim() : "";
  const targetRoleRaw =
    typeof payload.target_role === "string" ? payload.target_role.trim() : "";
  const targetRole =
    targetRoleRaw.length > 0
      ? targetRoleRaw.slice(0, MAX_TARGET_ROLE_CHARS)
      : null;
  const locationRaw =
    typeof payload.location === "string" ? payload.location.trim() : "";
  const location =
    locationRaw.length > 0 ? locationRaw.slice(0, MAX_LOCATION_CHARS) : null;

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
    return NextResponse.json(
      { error: "Server is not configured with an API key." },
      { status: 503 },
    );
  }

  try {
    const result = await matchRolesWithGemini(resume, targetRole, apiKey);

    // Best-effort log to Supabase (never block the response on this).
    void logSearch({ profile: result.profile, result, targetRole, location });

    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof LlmError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Unexpected /api/match error", err);
    return NextResponse.json(
      { error: "Something went wrong matching roles. Try again." },
      { status: 500 },
    );
  }
}

async function logSearch(args: {
  profile: unknown;
  result: unknown;
  targetRole: string | null;
  location: string | null;
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
    const admin = getAdminSupabase();
    await admin.from("searches").insert({
      user_id: userId,
      profile: args.profile,
      target_role: args.targetRole,
      location: args.location,
      result: args.result,
    });
  } catch (e) {
    console.error("logSearch failed (non-fatal)", e);
  }
}
