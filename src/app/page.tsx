"use client";

import { useState } from "react";
import type { RoastResult, Tone } from "@/lib/prompts";

const TONES: Array<{ id: Tone; emoji: string; label: string; sub: string }> = [
  { id: "roast", emoji: "🔥", label: "Roast", sub: "Funny & sharp" },
  { id: "honest", emoji: "🎯", label: "Honest", sub: "Direct & pro" },
  { id: "encouraging", emoji: "💚", label: "Encouraging", sub: "Supportive" },
];

export default function HomePage() {
  const [resume, setResume] = useState("");
  const [tone, setTone] = useState<Tone>("roast");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoastResult | null>(null);

  async function analyse() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, tone }),
      });
      const data = (await res.json()) as { result?: RoastResult; error?: string };
      if (!res.ok || !data.result) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setResult(data.result);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const charCount = resume.length;
  const tooShort = charCount > 0 && charCount < 200;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          🔥 CV Roast
        </h1>
        <p className="mt-3 text-lg text-neutral-600">
          Paste your CV. Get roasted. Get fixed. Get told where to apply.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Free. No login. No upload. Your CV is sent to Google Gemini for analysis
          and never stored on our servers.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
        <label className="mb-2 block text-sm font-semibold text-neutral-800">
          Pick a tone
        </label>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                tone === t.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
            >
              <div className="font-semibold">
                {t.emoji} {t.label}
              </div>
              <div
                className={`text-xs ${
                  tone === t.id ? "text-neutral-300" : "text-neutral-500"
                }`}
              >
                {t.sub}
              </div>
            </button>
          ))}
        </div>

        <label
          htmlFor="resume"
          className="mb-2 block text-sm font-semibold text-neutral-800"
        >
          Paste your CV (plain text)
        </label>
        <textarea
          id="resume"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your full CV here — name, summary, experience, skills, education..."
          className="h-72 w-full resize-y rounded-lg border border-neutral-300 bg-neutral-50 p-4 font-mono text-sm leading-relaxed focus:border-neutral-900 focus:bg-white focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
          <span>{charCount.toLocaleString()} characters</span>
          {tooShort && (
            <span className="text-amber-700">
              Need at least 200 characters
            </span>
          )}
        </div>

        <button
          onClick={analyse}
          disabled={loading || charCount < 200}
          className="mt-5 w-full rounded-lg bg-neutral-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {loading ? "Roasting your CV…" : "🔥 Roast my CV"}
        </button>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </section>

      {result && <ResultPanel result={result} />}

      <footer className="mt-16 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-500">
        Built with Next.js · Google Gemini · ❤️ on a weekend ·{" "}
        <a
          href="https://github.com/siddhu-tri2000/cv-roast"
          className="underline hover:text-neutral-900"
        >
          GitHub
        </a>
      </footer>
    </main>
  );
}

function ResultPanel({ result }: { result: RoastResult }) {
  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-bold">The Verdict</h2>
          <ScoreBadge score={result.overall_score} />
        </div>
        <p className="whitespace-pre-line text-neutral-700">
          {result.overall_roast}
        </p>
        <p className="mt-4 text-xs text-neutral-500">
          ⓘ Score is an AI-estimated Resume Health Score, not a real ATS score.
          No public tool can read inside Greenhouse / Workday / Lever.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold">Top 3 Fixes</h2>
        <ol className="space-y-3">
          {result.top_3_fixes.map((fix, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 text-neutral-800">{fix}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold">Section by Section</h2>
        <div className="space-y-4">
          {result.sections.map((s) => (
            <div
              key={s.name}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-neutral-900">{s.name}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    s.score >= 7
                      ? "bg-green-100 text-green-800"
                      : s.score >= 4
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {s.score}/10
                </span>
              </div>
              <p className="mb-2 text-sm italic text-neutral-700">{s.verdict}</p>
              {s.issues.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-sm text-neutral-700">
                  {s.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-green-600"
      : score >= 50
        ? "bg-amber-500"
        : "bg-red-600";
  return (
    <div className="text-right">
      <div
        className={`inline-flex items-baseline gap-1 rounded-full px-3 py-1 text-white ${color}`}
      >
        <span className="text-2xl font-bold">{score}</span>
        <span className="text-sm opacity-80">/100</span>
      </div>
      <div className="mt-1 text-xs text-neutral-500">Resume Health Score</div>
    </div>
  );
}
