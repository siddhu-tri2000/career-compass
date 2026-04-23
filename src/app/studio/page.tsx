"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CvInput from "@/components/CvInput";
import type { PolishOutput, TailorOutput, BulletRewrite } from "@/lib/studioPrompts";

type Mode = "polish" | "tailor";

function StudioPageInner() {
  const search = useSearchParams();
  const initialJd = search.get("jd") ?? "";
  const initialMode: Mode = initialJd ? "tailor" : "polish";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState(initialJd);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polishResult, setPolishResult] = useState<PolishOutput | null>(null);
  const [tailorResult, setTailorResult] = useState<TailorOutput | null>(null);

  useEffect(() => {
    if (initialJd && !resume) {
      const cached = typeof window !== "undefined" ? localStorage.getItem("cc:lastResume:v1") : null;
      if (cached) setResume(cached);
    }
  }, [initialJd, resume]);

  useEffect(() => {
    if (resume && resume.length > 100) {
      try {
        localStorage.setItem("cc:lastResume:v1", resume);
      } catch {
        /* ignore */
      }
    }
  }, [resume]);

  async function run() {
    setError(null);
    setPolishResult(null);
    setTailorResult(null);
    if (resume.trim().length < 200) {
      setError("Please paste or upload at least 200 characters of your CV.");
      return;
    }
    if (mode === "tailor" && jd.trim().length < 80) {
      setError("Please paste at least 80 characters of the job description.");
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "polish" ? "/api/studio/polish" : "/api/studio/tailor";
      const body = mode === "polish" ? { resume } : { resume, jd };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      if (mode === "polish") setPolishResult(data.result as PolishOutput);
      else setTailorResult(data.result as TailorOutput);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/40 via-white to-white">
      <nav className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-base font-bold text-neutral-900">
            <span className="text-2xl">🧭</span>
            <span>CareerCompass</span>
          </Link>
          <div className="flex gap-2">
            <Link
              href="/journey"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:border-neutral-500"
            >
              🧗 Journey
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-700">Resume Studio</div>
          <h1 className="mt-1 text-3xl font-extrabold text-neutral-900 sm:text-4xl">
            Make your CV survive any ATS.
          </h1>
          <p className="mt-2 max-w-2xl text-neutral-700">
            Upload your CV. Pick a mode. Get a recruiter-grade rewrite plus an ATS score in 30 seconds.
            Built on what Jobscan, Rezi, and Teal charge for — free.
          </p>
        </header>

        <div className="mb-6 inline-flex rounded-xl bg-neutral-100 p-1">
          <button
            onClick={() => setMode("polish")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              mode === "polish"
                ? "bg-white text-purple-800 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            🛠 ATS Polish
          </button>
          <button
            onClick={() => setMode("tailor")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              mode === "tailor"
                ? "bg-white text-purple-800 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            🎯 Tailor to JD
          </button>
        </div>

        <div className="mb-2 text-sm font-medium text-neutral-700">
          {mode === "polish"
            ? "We'll rewrite your CV for any ATS — no specific job needed."
            : "We'll rewrite your CV for one specific job — paste the JD below."}
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-neutral-800">Your CV</label>
            <CvInput value={resume} onChange={setResume} />
          </div>

          {mode === "tailor" && (
            <div>
              <label className="mb-1 block text-sm font-bold text-neutral-800">Job description</label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={14}
                className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm leading-relaxed text-neutral-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
              <p className="mt-1 text-xs text-neutral-500">{jd.length.toLocaleString()} characters</p>
            </div>
          )}
        </section>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analysing…
              </>
            ) : mode === "polish" ? (
              "🛠 Polish my CV"
            ) : (
              "🎯 Tailor my CV"
            )}
          </button>
          {error && <span className="text-sm font-semibold text-red-700">{error}</span>}
        </div>

        {polishResult && <PolishResultsView result={polishResult} />}
        {tailorResult && <TailorResultsView result={tailorResult} />}
      </main>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-500">Loading…</div>}>
      <StudioPageInner />
    </Suspense>
  );
}

/* ==================== Polish Results ==================== */

function PolishResultsView({ result }: { result: PolishOutput }) {
  return (
    <section className="mt-10 space-y-6">
      <ScoreCard
        score={result.ats_score.overall}
        title="ATS Score"
        subtitle={result.one_line_summary}
        accent="purple"
        breakdown={[
          { label: "Impact", value: result.ats_score.impact },
          { label: "Keywords", value: result.ats_score.keywords },
          { label: "ATS format", value: result.ats_score.ats_format },
          { label: "Brevity", value: result.ats_score.brevity },
        ]}
      />

      <ChecksGrid checks={result.checks} />

      {result.top_suggestions?.length > 0 && (
        <Panel title="🎯 Top suggestions" tone="amber">
          <ul className="list-inside list-disc space-y-1 text-sm text-neutral-800">
            {result.top_suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Panel>
      )}

      {result.rewritten_summary && (
        <Panel title="✏️ Rewritten professional summary" tone="indigo">
          <p className="text-sm leading-relaxed text-neutral-800">{result.rewritten_summary}</p>
          <CopyButton text={result.rewritten_summary} className="mt-3" />
        </Panel>
      )}

      <BulletDiffList bullets={result.rewritten_bullets} />

      <DownloadDocxButton polish={result} baseFilename="CareerCompass-ATS-Resume" />
    </section>
  );
}

/* ==================== Tailor Results ==================== */

function TailorResultsView({ result }: { result: TailorOutput }) {
  return (
    <section className="mt-10 space-y-6">
      <ScoreCard
        score={result.match_score}
        title="JD Match Score"
        subtitle={result.match_reason}
        accent={result.match_score >= 80 ? "emerald" : result.match_score >= 60 ? "amber" : "red"}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <KeywordPanel title="✅ Matched hard skills" chips={result.hard_skills_matched} tone="emerald" />
        <KeywordPanel title="❌ Missing hard skills" chips={result.hard_skills_missing} tone="red" />
      </div>

      {(result.soft_skills_matched?.length > 0 || result.soft_skills_missing?.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <KeywordPanel title="Matched soft skills" chips={result.soft_skills_matched} tone="emerald" compact />
          <KeywordPanel title="Missing soft skills" chips={result.soft_skills_missing} tone="neutral" compact />
        </div>
      )}

      {result.ats_format_warnings?.length > 0 && (
        <Panel title="⚠️ ATS format warnings" tone="amber">
          <ul className="list-inside list-disc space-y-1 text-sm text-neutral-800">
            {result.ats_format_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Panel>
      )}

      {result.rewritten_summary && (
        <Panel title="✏️ Tailored professional summary" tone="indigo">
          <p className="text-sm leading-relaxed text-neutral-800">{result.rewritten_summary}</p>
          <CopyButton text={result.rewritten_summary} className="mt-3" />
        </Panel>
      )}

      <BulletDiffList bullets={result.rewritten_bullets} />

      {result.cover_letter_hook && (
        <Panel title="💬 Cover-letter / DM opening" tone="purple">
          <p className="text-sm italic leading-relaxed text-neutral-800">&ldquo;{result.cover_letter_hook}&rdquo;</p>
          <CopyButton text={result.cover_letter_hook} className="mt-3" />
        </Panel>
      )}

      <DownloadDocxButton tailor={result} baseFilename="CareerCompass-Tailored-Resume" />
    </section>
  );
}

/* ==================== Building blocks ==================== */

function ScoreCard({
  score,
  title,
  subtitle,
  accent,
  breakdown,
}: {
  score: number;
  title: string;
  subtitle: string;
  accent: "purple" | "emerald" | "amber" | "red";
  breakdown?: { label: string; value: number }[];
}) {
  const ringColor = {
    purple: "stroke-purple-600",
    emerald: "stroke-emerald-600",
    amber: "stroke-amber-500",
    red: "stroke-red-600",
  }[accent];
  const bgGradient = {
    purple: "from-purple-50 to-white",
    emerald: "from-emerald-50 to-white",
    amber: "from-amber-50 to-white",
    red: "from-red-50 to-white",
  }[accent];
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circ;

  return (
    <div className={`rounded-2xl border border-neutral-200 bg-gradient-to-br ${bgGradient} p-5 shadow-sm`}>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
            <circle cx="60" cy="60" r={radius} className="fill-none stroke-neutral-200" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              className={`fill-none ${ringColor} transition-all duration-700`}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-extrabold text-neutral-900">{score}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">/ 100</div>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">{title}</div>
          <p className="mt-1 text-base text-neutral-800">{subtitle}</p>
          {breakdown && breakdown.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {breakdown.map((b) => (
                <div key={b.label} className="rounded-lg bg-white/70 p-2 text-center shadow-inner">
                  <div className="text-lg font-bold text-neutral-900">{b.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{b.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecksGrid({ checks }: { checks: PolishOutput["checks"] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-3 text-sm font-bold uppercase tracking-wider text-neutral-500">ATS checklist</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((c) => (
          <div
            key={c.id}
            className={`flex items-start gap-2 rounded-lg border p-2 text-sm ${
              c.passed ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"
            }`}
          >
            <span className="mt-0.5">{c.passed ? "✅" : "❌"}</span>
            <div className="flex-1">
              <div className="font-semibold text-neutral-900">{c.label}</div>
              <div className="text-xs text-neutral-600">{c.hint}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeywordPanel({
  title,
  chips,
  tone,
  compact = false,
}: {
  title: string;
  chips: { keyword: string; importance: "must_have" | "nice_to_have" }[];
  tone: "emerald" | "red" | "neutral";
  compact?: boolean;
}) {
  const palette = {
    emerald: "border-emerald-200 bg-emerald-50/50",
    red: "border-red-200 bg-red-50/50",
    neutral: "border-neutral-200 bg-neutral-50",
  }[tone];
  const chipBase =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-900"
      : tone === "red"
        ? "bg-red-100 text-red-900"
        : "bg-neutral-200 text-neutral-800";
  const chipStrong =
    tone === "emerald"
      ? "bg-emerald-700 text-white"
      : tone === "red"
        ? "bg-red-700 text-white"
        : "bg-neutral-700 text-white";

  return (
    <div className={`rounded-2xl border ${palette} p-4 shadow-sm`}>
      <div className="mb-2 text-sm font-bold text-neutral-900">{title}</div>
      {chips.length === 0 ? (
        <div className="text-xs text-neutral-500">None.</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span
              key={`${c.keyword}-${i}`}
              className={`rounded-full px-2 py-0.5 ${
                compact ? "text-[11px]" : "text-xs"
              } font-semibold ${c.importance === "must_have" ? chipStrong : chipBase}`}
              title={c.importance === "must_have" ? "Must-have" : "Nice-to-have"}
            >
              {c.keyword}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "indigo" | "purple" | "amber";
  children: React.ReactNode;
}) {
  const palette = {
    indigo: "border-indigo-200 bg-indigo-50/40",
    purple: "border-purple-200 bg-purple-50/40",
    amber: "border-amber-200 bg-amber-50/40",
  }[tone];
  return (
    <div className={`rounded-2xl border ${palette} p-5 shadow-sm`}>
      <div className="mb-2 text-sm font-bold uppercase tracking-wider text-neutral-700">{title}</div>
      {children}
    </div>
  );
}

function BulletDiffList({ bullets }: { bullets: BulletRewrite[] }) {
  if (!bullets?.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-extrabold text-neutral-900">✨ Rewritten bullets</h2>
      <div className="space-y-3">
        {bullets.map((b, i) => (
          <article key={i} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">{b.section}</div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div className="rounded-lg bg-neutral-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Before</div>
                <div className="mt-1 text-sm leading-relaxed text-neutral-700 line-through decoration-neutral-300">
                  {b.original}
                </div>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">After</div>
                <div className="mt-1 text-sm leading-relaxed font-medium text-neutral-900">{b.rewritten}</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-neutral-500">💡 {b.why_better}</p>
              <CopyButton text={b.rewritten} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className={`inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 hover:border-neutral-500 ${className}`}
    >
      {copied ? "✓ Copied" : "📋 Copy"}
    </button>
  );
}

/* ==================== Download .docx ==================== */

function DownloadDocxButton({
  polish,
  tailor,
  baseFilename,
}: {
  polish?: PolishOutput;
  tailor?: TailorOutput;
  baseFilename: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const structured = polish?.structured_resume || tailor?.structured_resume;

  async function handleDownload() {
    if (!structured) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/studio/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structured_resume: structured, filename: baseFilename }),
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseFilename}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  if (!structured) return null;

  return (
    <div className="rounded-2xl border border-purple-300 bg-gradient-to-r from-purple-100 to-indigo-100 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-bold text-neutral-900">📄 Download as ATS-safe .docx</div>
          <p className="text-sm text-neutral-700">
            Single-column, dates right-aligned, no tables — exactly what every ATS expects.
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-purple-800 disabled:opacity-60"
        >
          {downloading ? "Preparing…" : "Download .docx"}
        </button>
      </div>
    </div>
  );
}
