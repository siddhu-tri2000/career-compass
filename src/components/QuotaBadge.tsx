"use client";

import { useEffect, useState } from "react";

interface QuotaBadgeProps {
  tool: "map" | "ghost" | "studio";
  refreshKey?: number;
  className?: string;
}

interface UsageResp {
  signedIn: boolean;
  limit: number;
  byTool: Record<string, { used: number; remaining: number }>;
}

/**
 * Tiny pill that shows "X of Y left today" for the given tool.
 * Pass `refreshKey` (any value that changes after a successful run) to refetch.
 */
export default function QuotaBadge({ tool, refreshKey, className = "" }: QuotaBadgeProps) {
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
  const t = data.byTool[tool] ?? { used: 0, remaining: data.limit };
  const remaining = t.remaining;
  const tone =
    remaining === 0
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : remaining === 1
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone} ${className}`}
      title={
        data.signedIn
          ? `Free tier: ${data.limit} runs/day per tool`
          : `Anonymous tier: ${data.limit} runs/day. Sign in for ${5}/day.`
      }
    >
      <span aria-hidden>{remaining === 0 ? "🚫" : "⚡"}</span>
      <span>
        {remaining} of {data.limit} left today
      </span>
    </span>
  );
}
