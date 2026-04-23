"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LearningResource } from "@/lib/prompts";

interface Journey {
  id: string;
  skill: string;
  target_role: string | null;
  source: string | null;
  status: "in_progress" | "completed" | "paused";
  why_it_matters: string | null;
  resources: LearningResource[] | null;
  hours_logged: number;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}

const HOURS_TO_CV = 5;

function resourceUrl(r: LearningResource): string {
  const q = encodeURIComponent(r.search_query);
  if (r.type === "youtube") return `https://www.youtube.com/results?search_query=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

function resourceIcon(t: LearningResource["type"]): string {
  switch (t) {
    case "youtube": return "▶️";
    case "course": return "🎓";
    case "docs": return "📘";
    case "article": return "📰";
    case "practice": return "🛠";
  }
}

export default function JourneyPage() {
  const [loading, setLoading] = useState(true);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [logging, setLogging] = useState<string | null>(null);
  const [logMinutes, setLogMinutes] = useState<number>(15);
  const [logTitle, setLogTitle] = useState<string>("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/journey");
      if (res.status === 401) {
        setAuthNeeded(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load");
      setJourneys(data.journeys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const total = journeys.length;
    const inProgress = journeys.filter((j) => j.status === "in_progress").length;
    const completed = journeys.filter((j) => j.status === "completed").length;
    const totalHours = journeys.reduce((acc, j) => acc + Number(j.hours_logged || 0), 0);
    return { total, inProgress, completed, totalHours };
  }, [journeys]);

  async function setStatus(id: string, status: Journey["status"]) {
    const res = await fetch("/api/journey", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) void load();
  }

  async function remove(id: string) {
    if (!confirm("Stop tracking this skill? Your logs will be deleted too.")) return;
    const res = await fetch("/api/journey", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) void load();
  }

  async function logTime(journey_id: string) {
    if (logMinutes < 1) return;
    const res = await fetch("/api/journey/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        journey_id,
        minutes: logMinutes,
        resource_title: logTitle.trim() || null,
      }),
    });
    if (res.ok) {
      setLogging(null);
      setLogMinutes(15);
      setLogTitle("");
      void load();
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
      <nav className="flex items-center justify-between gap-2 py-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-neutral-900">
          <span className="text-xl">🧭</span>
          <span className="hidden sm:inline">CareerCompass</span>
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-neutral-700 backdrop-blur hover:border-indigo-300"
        >
          ← Back to map
        </Link>
      </nav>

      <header className="pt-6 pb-6 text-center sm:pt-10">
        <div className="fade-up mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-800 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
          Real progress · Real readiness
        </div>
        <h1 className="hero-shimmer fade-up fade-up-delay-1 bg-gradient-to-br from-neutral-900 via-emerald-900 to-indigo-900 bg-clip-text pb-2 text-3xl font-extrabold leading-[1.15] tracking-tight text-transparent sm:text-5xl">
          🧗 Your Skill Journey
        </h1>
        <p className="fade-up fade-up-delay-2 mx-auto mt-3 max-w-2xl text-base text-neutral-600 sm:text-lg">
          Track the gaps you&apos;re closing. Log learning sessions. Watch your readiness climb. Real progress, no fake XP.
        </p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-neutral-200 bg-white/80 p-8 text-center text-sm text-neutral-600 backdrop-blur">
          Loading your journey…
        </div>
      )}

      {authNeeded && !loading && (
        <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 p-8 text-center">
          <div className="text-5xl">🔐</div>
          <h2 className="mt-3 text-xl font-bold text-neutral-900">Sign in to start your journey</h2>
          <p className="mt-2 mx-auto max-w-md text-sm text-neutral-700">
            Skill Journey saves your tracked gaps and learning hours. Sign in (Google or GitHub) to keep your progress safe across devices.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-800"
          >
            Go sign in →
          </Link>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !authNeeded && !error && <WeeklyDigestCard />}

      {!loading && !authNeeded && journeys.length === 0 && !error && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-neutral-300 bg-white/60 p-8 text-center backdrop-blur">
          <div className="text-5xl">🪴</div>
          <h2 className="mt-3 text-lg font-bold text-neutral-900">Your journey is empty</h2>
          <p className="mt-2 mx-auto max-w-md text-sm text-neutral-700">
            Run a career map, then click <span className="font-semibold">📌 Track this skill</span> on any gap to start your journey.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-800"
          >
            🧭 Create my map →
          </Link>
        </div>
      )}

      {!loading && !authNeeded && journeys.length > 0 && (
        <>
          {/* Stats strip */}
          <div className="fade-up grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Tracked" value={String(stats.total)} icon="🎯" />
            <StatTile label="In progress" value={String(stats.inProgress)} icon="🔥" />
            <StatTile label="Completed" value={String(stats.completed)} icon="✅" />
            <StatTile label="Hours logged" value={stats.totalHours.toFixed(1)} icon="⏱" />
          </div>

          <div className="mt-6 space-y-4">
            {journeys.map((j) => {
              const pct = Math.min(100, Math.round((Number(j.hours_logged) / HOURS_TO_CV) * 100));
              const milestone =
                j.status === "completed"
                  ? "🏆 Skill closed — update your CV!"
                  : Number(j.hours_logged) >= HOURS_TO_CV
                    ? `🎉 ${HOURS_TO_CV}h logged — time to add this to your CV!`
                    : Number(j.hours_logged) >= HOURS_TO_CV / 2
                      ? "🚀 Halfway there — keep going."
                      : Number(j.hours_logged) > 0
                        ? "🌱 Started — great first move."
                        : "⏳ Not yet started — log your first session below.";

              return (
                <article
                  key={j.id}
                  className={`rounded-2xl border-2 bg-white/95 p-5 shadow-md backdrop-blur transition ${
                    j.status === "completed"
                      ? "border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-white"
                      : j.status === "paused"
                        ? "border-neutral-200 opacity-75"
                        : "border-indigo-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-100"
                  }`}
                >
                  {/* Header */}
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-neutral-900">{j.skill}</h3>
                        <StatusPill status={j.status} />
                      </div>
                      {j.target_role && (
                        <p className="mt-0.5 text-xs text-neutral-600">
                          For: <span className="font-semibold">{j.target_role}</span>
                        </p>
                      )}
                      {j.why_it_matters && (
                        <p className="mt-1 text-sm text-neutral-700">{j.why_it_matters}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {j.status !== "completed" && (
                        <button
                          onClick={() => setStatus(j.id, "completed")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          ✅ Done
                        </button>
                      )}
                      {j.status === "completed" && (
                        <button
                          onClick={() => setStatus(j.id, "in_progress")}
                          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          ↩ Reopen
                        </button>
                      )}
                      <button
                        onClick={() => remove(j.id)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-neutral-600">
                      <span>{Number(j.hours_logged).toFixed(1)} h logged · target {HOURS_TO_CV} h to add to CV</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-medium text-neutral-700">{milestone}</p>
                  </div>

                  {/* Log session */}
                  {j.status !== "completed" && (
                    <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      {logging === j.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={logTitle}
                            onChange={(e) => setLogTitle(e.target.value)}
                            placeholder="What did you learn? (optional, e.g. 'TechWorld Nana K8s crash course')"
                            className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="text-xs font-semibold text-neutral-700">Minutes:</label>
                            {[15, 30, 45, 60, 90].map((m) => (
                              <button
                                key={m}
                                onClick={() => setLogMinutes(m)}
                                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                  logMinutes === m
                                    ? "bg-indigo-700 text-white"
                                    : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                            <input
                              type="number"
                              value={logMinutes}
                              onChange={(e) => setLogMinutes(Math.max(1, Math.min(600, Number(e.target.value) || 0)))}
                              className="w-20 rounded-md border border-neutral-300 bg-white p-1 text-sm"
                              min={1}
                              max={600}
                            />
                            <button
                              onClick={() => logTime(j.id)}
                              className="ml-auto rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                            >
                              💾 Save
                            </button>
                            <button
                              onClick={() => { setLogging(null); setLogTitle(""); }}
                              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setLogging(j.id); setLogMinutes(15); }}
                          className="w-full rounded-md border-2 border-dashed border-emerald-400 bg-white py-2 text-sm font-semibold text-emerald-800 hover:border-emerald-600 hover:bg-emerald-50"
                        >
                          + Log a learning session
                        </button>
                      )}
                    </div>
                  )}

                  {/* Resources */}
                  {j.resources && j.resources.length > 0 && (
                    <div className="mt-4 border-t border-neutral-100 pt-3">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-700">
                        📚 Curated resources
                      </div>
                      <div className="space-y-1.5">
                        {j.resources.map((r, i) => (
                          <a
                            key={i}
                            href={resourceUrl(r)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start gap-2 rounded-md border border-neutral-200 bg-white p-2 transition hover:border-indigo-400 hover:shadow-sm"
                          >
                            <span className="text-base leading-none">{resourceIcon(r.type)}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-neutral-900 group-hover:text-indigo-800">
                                {r.title}
                              </span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-600">
                                <span className="font-medium">{r.provider}</span>
                                <span className="text-neutral-300">·</span>
                                <span>⏱ {r.time_estimate}</span>
                              </span>
                            </span>
                            <span aria-hidden className="self-center text-neutral-400 group-hover:text-indigo-600">↗</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 text-2xl font-extrabold text-neutral-900">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: Journey["status"] }) {
  const cfg = {
    in_progress: { c: "bg-indigo-100 text-indigo-800", l: "🔥 In progress" },
    completed:   { c: "bg-emerald-100 text-emerald-800", l: "✅ Completed" },
    paused:      { c: "bg-neutral-200 text-neutral-700", l: "⏸ Paused" },
  }[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${cfg.c}`}>
      {cfg.l}
    </span>
  );
}

interface SubData {
  id: string;
  email: string;
  paused: boolean;
}

function WeeklyDigestCard() {
  const [sub, setSub] = useState<SubData | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/subscribe");
        if (!res.ok) return;
        const json = await res.json();
        if (json?.subscription) setSub(json.subscription as SubData);
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function subscribe() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      setSub(json.subscription as SubData);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to subscribe");
    } finally {
      setBusy(false);
    }
  }

  async function togglePaused() {
    if (!sub) return;
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paused: !sub.paused }),
      });
      const json = await res.json();
      if (res.ok && json?.subscription) setSub(json.subscription as SubData);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    if (!sub) return;
    if (!confirm("Stop the weekly email and forget your subscription?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe", { method: "DELETE" });
      if (res.ok) setSub(null);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;

  return (
    <section className="fade-up mt-4 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-5 shadow-md backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="text-2xl">📬</div>
        <div className="flex-1">
          <h3 className="text-base font-extrabold text-neutral-900">
            {sub ? "Weekly digest" : "Get the weekly digest"}
          </h3>
          <p className="mt-0.5 text-sm text-neutral-700">
            {sub
              ? sub.paused
                ? `Paused. We won't send to ${sub.email} until you resume.`
                : `Every Sunday morning IST: your week's hours, a fresh insight tuned to your tracked skills, and one thing to do this week. Sent to ${sub.email}.`
              : "Every Sunday morning IST: a 60-second read with your week's hours, a fresh insight tuned to your tracked skills, and one thing to do this week. No spam, unsubscribe in one click."}
          </p>

          {!sub && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
              />
              <button
                onClick={subscribe}
                disabled={busy || emailInput.trim().length < 5}
                className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-800 disabled:opacity-50"
              >
                {busy ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
          )}

          {sub && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={togglePaused}
                disabled={busy}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-500 disabled:opacity-50"
              >
                {sub.paused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button
                onClick={unsubscribe}
                disabled={busy}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-500 disabled:opacity-50"
              >
                Unsubscribe
              </button>
            </div>
          )}

          {err && <div className="mt-2 text-xs text-red-700">{err}</div>}
        </div>
      </div>
    </section>
  );
}

