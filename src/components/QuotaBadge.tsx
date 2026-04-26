"use client";

import { useEffect, useState } from "react";

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

  if (!data.signedIn) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800 ${className}`}
        title={`Sign in to use the tools — ${data.limit} free runs/day across all tools.`}
      >
        <span aria-hidden>🔐</span>
        <span>Sign in for {data.limit} runs/day</span>
      </span>
    );
  }

  const remaining = data.remaining;
  const tone =
    remaining === 0
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : remaining === 1
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone} ${className}`}
      title={`Free tier: ${data.limit} runs/day shared across Map, Studio, and Ghost Buster`}
    >
      <span aria-hidden>{remaining === 0 ? "🚫" : "⚡"}</span>
      <span>
        {remaining} of {data.limit} left today
      </span>
    </span>
  );
}
