import { NextResponse } from "next/server";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WaitlistBody {
  email?: unknown;
  tool?: unknown;
  source?: unknown;
  note?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_TOOLS = new Set(["map", "ghost", "studio"]);
const ALLOWED_SOURCES = new Set(["quota_modal", "manual", "footer"]);

export async function POST(req: Request) {
  const rl = await checkRateLimit(req, "waitlist", 10, 60);
  if (!rl.success) return rateLimitResponse(rl);

  let payload: WaitlistBody;
  try {
    payload = (await req.json()) as WaitlistBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const tool = typeof payload.tool === "string" && ALLOWED_TOOLS.has(payload.tool) ? payload.tool : null;
  const source =
    typeof payload.source === "string" && ALLOWED_SOURCES.has(payload.source)
      ? payload.source
      : "manual";
  const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 500) : null;

  let userId: string | null = null;
  try {
    const supa = await getServerSupabase();
    const { data } = await supa.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* anon */
  }

  try {
    const admin = getAdminSupabase();
    const { error } = await admin
      .from("waitlist")
      .upsert(
        { email, user_id: userId, tool, source, note },
        { onConflict: "email", ignoreDuplicates: false },
      );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("waitlist insert failed", e);
    return NextResponse.json({ error: "Couldn't save right now. Try again." }, { status: 500 });
  }
}
