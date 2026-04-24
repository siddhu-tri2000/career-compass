"use client";

import { useEffect, useState } from "react";

const MIN_TO_DISPLAY = 25;

type Stats = { searches_total: number; searches_7d: number; users_total: number };

export default function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d: Stats) => setStats(d))
      .catch(() => {});
  }, []);

  if (!stats) return null;
  if (stats.searches_total < MIN_TO_DISPLAY) return null;

  return (
    <span className="sticker text-rose-800 ring-1 ring-rose-200/70 bg-rose-50">
      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden />
      <span>
        <span className="font-bold">{stats.searches_total.toLocaleString()}</span> analyses run
      </span>
    </span>
  );
}
