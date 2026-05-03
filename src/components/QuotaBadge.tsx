"use client";

import { useEffect, useState } from "react";
import { Crown, Lock, Zap, Ban } from "lucide-react";

interface QuotaBadgeProps {
  /** Tool the page belongs to (kept for analytics/tooltip context — quota is shared). */
  tool?: "map" | "ghost" | "studio";
  refreshKey?: number;
  className?: string;
}

interface UsageResp {
  signedIn: boolean;
  limit: number;
  used: number;
  remaining: number;
  isAdmin?: boolean;
}

/**
 * Tiny pill that shows "X of Y left today" — quota is shared across all tools,
 * so the same number renders on every page.
 */
export default function QuotaBadge({ refreshKey, className = "" }: QuotaBadgeProps) {
  const [data, setData] = useState<UsageResp | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: UsageResp) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!data) return null;

  if (data.isAdmin) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-200 ${className}`}
        title="Admin account — daily quota bypassed."
      >
        <Crown className="h-3 w-3" strokeWidth={2} />
        <span>Admin · Unlimited</span>
      </span>
    );
  }

  if (!data.signedIn) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-white/80 ${className}`}
        title={`${data.remaining} of ${data.limit} free try left. Sign in for ${5} runs/day.`}
      >
        <Lock className="h-3 w-3" strokeWidth={2} />
        <span>{data.remaining > 0 ? `${data.remaining} free try · Sign in for more` : "Sign in for 5 runs/day"}</span>
      </span>
    );
  }

  const remaining = data.remaining;
  const tone =
    remaining === 0
      ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
      : remaining === 1
      ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone} ${className}`}
      title={`Free tier: ${data.limit} runs/day shared across Career Map, Resume Studio, and JD Ghost Buster`}
    >
      <span aria-hidden>{remaining === 0 ? <Ban className="h-3 w-3" strokeWidth={2} /> : <Zap className="h-3 w-3" strokeWidth={2} />}</span>
      <span>
        {remaining} of {data.limit} left today
      </span>
    </span>
  );
}
