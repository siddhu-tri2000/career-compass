import { createHash } from "node:crypto";
import { getServerSupabase, getAdminSupabase } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/rateLimit";

/**
 * Daily free-tier quotas (per tool, per Asia/Kolkata day).
 * Anonymous (by IP) gets a small taste; signed-in (by user_id) gets more.
 * After the signed-in cap, the API returns 402 and the client opens the
 * waitlist modal (we don't charge yet — we capture demand).
 */
export const DAILY_LIMITS = {
  anon: 2,
  user: 5,
} as const;

export type Tool = "map" | "ghost" | "studio";
export const TOOLS: readonly Tool[] = ["map", "ghost", "studio"] as const;

export type QuotaCheck =
  | { ok: true; tool: Tool; subject: "user" | "ip"; remaining: number; limit: number }
  | { ok: false; code: "sign_in_required"; tool: Tool; remaining: 0; limit: number; usedAnon: number }
  | { ok: false; code: "quota_exceeded"; tool: Tool; remaining: 0; limit: number };

/** YYYY-MM-DD in Asia/Kolkata, suitable for SQL `date` column. */
export function dayIST(now: Date = new Date()): string {
  // 'en-CA' gives ISO YYYY-MM-DD format with the supplied timeZone.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Hash IP so we never store raw IPs in the usage table. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`cc:${ip}`).digest("hex").slice(0, 32);
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supa = await getServerSupabase();
    const { data } = await supa.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function readCount(
  subjectType: "user" | "ip",
  subjectKey: string,
  tool: Tool,
  day: string,
): Promise<number> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("usage_daily")
    .select("count")
    .eq("subject_type", subjectType)
    .eq("subject_key", subjectKey)
    .eq("tool", tool)
    .eq("day_ist", day)
    .maybeSingle();
  return data?.count ?? 0;
}

/**
 * Check whether the request is allowed under today's quota.
 * Does NOT increment — call `recordUsage()` after a successful AI call.
 */
export async function checkQuota(req: Request, tool: Tool): Promise<QuotaCheck> {
  const userId = await getCurrentUserId();
  const day = dayIST();

  if (userId) {
    const used = await readCount("user", userId, tool, day);
    const remaining = Math.max(0, DAILY_LIMITS.user - used);
    if (remaining <= 0) {
      return { ok: false, code: "quota_exceeded", tool, remaining: 0, limit: DAILY_LIMITS.user };
    }
    return { ok: true, tool, subject: "user", remaining, limit: DAILY_LIMITS.user };
  }

  const ipKey = hashIp(getClientIp(req));
  const used = await readCount("ip", ipKey, tool, day);
  const remaining = Math.max(0, DAILY_LIMITS.anon - used);
  if (remaining <= 0) {
    return {
      ok: false,
      code: "sign_in_required",
      tool,
      remaining: 0,
      limit: DAILY_LIMITS.anon,
      usedAnon: used,
    };
  }
  return { ok: true, tool, subject: "ip", remaining, limit: DAILY_LIMITS.anon };
}

/**
 * Record one successful AI call against today's bucket. Atomic via Postgres fn.
 * Best-effort — failures are logged but never block the response.
 */
export async function recordUsage(req: Request, tool: Tool): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const subjectType: "user" | "ip" = userId ? "user" : "ip";
    const subjectKey = userId ?? hashIp(getClientIp(req));
    const admin = getAdminSupabase();
    await admin.rpc("bump_usage", {
      p_subject_type: subjectType,
      p_subject_key: subjectKey,
      p_tool: tool,
      p_day_ist: dayIST(),
    });
  } catch (e) {
    console.error("recordUsage failed (non-fatal)", e);
  }
}

/** Standardised JSON response when the quota gate blocks the request. */
export function quotaBlockedResponse(check: Extract<QuotaCheck, { ok: false }>): Response {
  const status = check.code === "sign_in_required" ? 401 : 402;
  return new Response(
    JSON.stringify({
      error:
        check.code === "sign_in_required"
          ? "You've used your free daily tries. Sign in to unlock 5 more."
          : "You've used today's 5 free runs. Pro packs are launching soon.",
      code: check.code,
      tool: check.tool,
      limit: check.limit,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/** Read today's usage for a subject across all tools (for the badge). */
export async function getTodayUsageSummary(req: Request): Promise<{
  signedIn: boolean;
  limit: number;
  byTool: Record<Tool, { used: number; remaining: number }>;
}> {
  const userId = await getCurrentUserId();
  const day = dayIST();
  const subjectType: "user" | "ip" = userId ? "user" : "ip";
  const subjectKey = userId ?? hashIp(getClientIp(req));
  const limit = userId ? DAILY_LIMITS.user : DAILY_LIMITS.anon;

  const admin = getAdminSupabase();
  const { data } = await admin
    .from("usage_daily")
    .select("tool, count")
    .eq("subject_type", subjectType)
    .eq("subject_key", subjectKey)
    .eq("day_ist", day);

  const byTool = TOOLS.reduce<Record<Tool, { used: number; remaining: number }>>(
    (acc, t) => {
      acc[t] = { used: 0, remaining: limit };
      return acc;
    },
    {} as Record<Tool, { used: number; remaining: number }>,
  );
  for (const row of data ?? []) {
    const t = row.tool as Tool;
    if (TOOLS.includes(t)) {
      byTool[t] = { used: row.count, remaining: Math.max(0, limit - row.count) };
    }
  }
  return { signedIn: !!userId, limit, byTool };
}
