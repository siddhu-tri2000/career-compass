import { createHash } from "crypto";
import { getServerSupabase, getAdminSupabase } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getClientIp } from "@/lib/rateLimit";

/**
 * Daily free-tier quota (per Asia/Kolkata day).
 *
 * anonymous — 1 free run (tracked by hashed IP) before sign-in is required.
 *             Yes, IP tracking is leaky (NAT, rotation), but a single free
 *             taste is enough to hook users and convert them to signed-in.
 * user      — 5 runs/day for signed-in users (shared across all tools).
 *
 * After a signed-in user hits the cap, the API returns 402 and the client
 * opens the waitlist modal (we don't charge yet — we capture demand).
 *
 * Admins (ADMIN_EMAILS env var) bypass the quota entirely.
 */
export const DAILY_LIMITS = {
  anonymous: 1,
  user: 5,
} as const;

export type Tool = "map" | "ghost" | "studio";
export const TOOLS: readonly Tool[] = ["map", "ghost", "studio"] as const;

export type QuotaCheck =
  | { ok: true; tool: Tool; subject: "user"; remaining: number; limit: number; unlimited?: boolean }
  | { ok: false; code: "sign_in_required"; tool: Tool; remaining: 0; limit: number }
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

/** SHA-256 hash of an IP — avoids storing raw IPs in the DB. */
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

async function getCurrentUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const supa = await getServerSupabase();
    const { data } = await supa.auth.getUser();
    if (!data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

async function readTodayTotal(subjectType: "user" | "ip", subjectKey: string, day: string): Promise<number> {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("usage_daily")
    .select("count")
    .eq("subject_type", subjectType)
    .eq("subject_key", subjectKey)
    .eq("day_ist", day);
  return (data ?? []).reduce((sum, row) => sum + (row.count ?? 0), 0);
}

/**
 * Check whether the request is allowed under today's quota.
 *
 * Anonymous callers get 1 free run/day (tracked by hashed IP). After that,
 * they must sign in — the API returns 401 with `sign_in_required`.
 *
 * Signed-in users get 5 runs/day (shared across all tools).
 * Admins (ADMIN_EMAILS env var) bypass the quota entirely.
 * Does NOT increment — call `recordUsage()` after a successful AI call.
 */
export async function checkQuota(req: Request, tool: Tool): Promise<QuotaCheck> {
  const user = await getCurrentUser();

  if (!user) {
    // Anonymous: allow 1 free taste, then require sign-in.
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const used = await readTodayTotal("ip", ipHash, dayIST());
    const remaining = Math.max(0, DAILY_LIMITS.anonymous - used);
    if (remaining <= 0) {
      return {
        ok: false,
        code: "sign_in_required",
        tool,
        remaining: 0,
        limit: DAILY_LIMITS.anonymous,
      };
    }
    return { ok: true, tool, subject: "user", remaining, limit: DAILY_LIMITS.anonymous };
  }

  if (isAdminEmail(user.email)) {
    return {
      ok: true,
      tool,
      subject: "user",
      remaining: 9999,
      limit: 9999,
      unlimited: true,
    };
  }

  const used = await readTodayTotal("user", user.id, dayIST());
  const remaining = Math.max(0, DAILY_LIMITS.user - used);
  if (remaining <= 0) {
    return { ok: false, code: "quota_exceeded", tool, remaining: 0, limit: DAILY_LIMITS.user };
  }
  return { ok: true, tool, subject: "user", remaining, limit: DAILY_LIMITS.user };
}

/**
 * Record one successful AI call against today's bucket. Atomic via Postgres fn.
 * For anonymous callers, records against their hashed IP.
 * No-op for admins so analytics aren't polluted by internal usage.
 * Best-effort — failures are logged but never block the response.
 */
export async function recordUsage(req: Request, tool: Tool): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (user && isAdminEmail(user.email)) return;

    const admin = getAdminSupabase();
    if (user) {
      await admin.rpc("bump_usage", {
        p_subject_type: "user",
        p_subject_key: user.id,
        p_tool: tool,
        p_day_ist: dayIST(),
      });
    } else {
      const ip = getClientIp(req);
      const ipHash = hashIp(ip);
      await admin.rpc("bump_usage", {
        p_subject_type: "ip",
        p_subject_key: ipHash,
        p_tool: tool,
        p_day_ist: dayIST(),
      });
    }
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
          ? "Sign in to unlock 5 free runs per day."
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

/** Read today's usage for the caller (single combined counter). */
export async function getTodayUsageSummary(req: Request): Promise<{
  signedIn: boolean;
  limit: number;
  used: number;
  remaining: number;
  isAdmin?: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) {
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const limit = DAILY_LIMITS.anonymous;
    const used = await readTodayTotal("ip", ipHash, dayIST());
    return { signedIn: false, limit, used, remaining: Math.max(0, limit - used) };
  }
  if (isAdminEmail(user.email)) {
    return { signedIn: true, limit: 9999, used: 0, remaining: 9999, isAdmin: true };
  }
  const limit = DAILY_LIMITS.user;
  const used = await readTodayTotal("user", user.id, dayIST());
  return {
    signedIn: true,
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}
