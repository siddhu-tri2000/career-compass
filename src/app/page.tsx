"use client";

import { useState } from "react";
import type { MatchResult, RoastResult, Tone } from "@/lib/prompts";
import { buildJobLinks } from "@/lib/jobLinks";

const TONES: Array<{ id: Tone; emoji: string; label: string; sub: string }> = [
  { id: "honest", emoji: "🎯", label: "Direct", sub: "Professional & clear" },
  { id: "encouraging", emoji: "💚", label: "Supportive", sub: "Constructive" },
  { id: "roast", emoji: "🔥", label: "Punchy", sub: "Funny & sharp" },
];

export default function HomePage() {
  const [resume, setResume] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [location, setLocation] = useState("");

  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const [tone, setTone] = useState<Tone>("honest");
  const [assessLoading, setAssessLoading] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);
  const [assessResult, setAssessResult] = useState<RoastResult | null>(null);

  async function mapCareer() {
    setMatchLoading(true);
    setMatchError(null);
    setMatchResult(null);
    setAssessResult(null);
    setAssessError(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          target_role: targetRole.trim() || null,
        }),
      });
      const data = (await res.json()) as { result?: MatchResult; error?: string };
      if (!res.ok || !data.result) {
        setMatchError(data.error ?? "Something went wrong.");
      } else {
        setMatchResult(data.result);
      }
    } catch {
      setMatchError("Network error. Please check your connection and try again.");
    } finally {
      setMatchLoading(false);
    }
  }

  async function assessCV() {
    setAssessLoading(true);
    setAssessError(null);
    setAssessResult(null);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, tone }),
      });
      const data = (await res.json()) as { result?: RoastResult; error?: string };
      if (!res.ok || !data.result) {
        setAssessError(data.error ?? "Something went wrong.");
      } else {
        setAssessResult(data.result);
      }
    } catch {
      setAssessError("Network error. Please check your connection and try again.");
    } finally {
      setAssessLoading(false);
    }
  }

  const charCount = resume.length;
  const tooShort = charCount > 0 && charCount < 200;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          🧭 CareerCompass
        </h1>
        <p className="mt-3 text-lg text-neutral-600">
          Stop guessing which jobs to apply for.
        </p>
        <p className="mt-1 text-base text-neutral-500">
          Paste your CV — get a personalised career map in 30 seconds.
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          Free · No login · Your CV is sent to Google Gemini for analysis and
          never stored on our servers.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
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
          className="h-64 w-full resize-y rounded-lg border border-neutral-300 bg-neutral-50 p-4 font-mono text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-700 focus:bg-white focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
          <span>{charCount.toLocaleString()} characters</span>
          {tooShort && (
            <span className="text-amber-700">Need at least 200 characters</span>
          )}
        </div>

        <label
          htmlFor="targetRole"
          className="mt-5 mb-2 block text-sm font-semibold text-neutral-800"
        >
          Optional — what role do you want next?{" "}
          <span className="font-normal text-neutral-500">
            (we&apos;ll show your readiness + skill gaps)
          </span>
        </label>
        <input
          id="targetRole"
          type="text"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="e.g. Senior Product Manager, Director of Engineering, Data Scientist"
          maxLength={100}
          className="w-full rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-700 focus:bg-white focus:outline-none"
        />

        <label
          htmlFor="location"
          className="mt-5 mb-2 block text-sm font-semibold text-neutral-800"
        >
          Optional — preferred location{" "}
          <span className="font-normal text-neutral-500">
            (used for live job search links)
          </span>
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Bengaluru, Mumbai, Remote, London"
          maxLength={60}
          className="w-full rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-700 focus:bg-white focus:outline-none"
        />

        <button
          onClick={mapCareer}
          disabled={matchLoading || charCount < 200}
          className="mt-5 w-full rounded-lg bg-indigo-700 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {matchLoading ? "Mapping your career…" : "🧭 Map my career"}
        </button>

        {matchError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {matchError}
          </div>
        )}
      </section>

      {matchResult && (
        <MatchResultsPanel result={matchResult} location={location} />
      )}

      {matchResult && (
        <AssessmentPanel
          tone={tone}
          setTone={setTone}
          assessCV={assessCV}
          assessLoading={assessLoading}
          assessError={assessError}
          assessResult={assessResult}
        />
      )}

      <footer className="mt-16 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-500">
        Built with Next.js · Google Gemini · Open source ·{" "}
        <a
          href="https://github.com/siddhu-tri2000/career-compass"
          className="underline hover:text-neutral-900"
        >
          GitHub
        </a>
      </footer>
    </main>
  );
}

function MatchResultsPanel({
  result,
  location,
}: {
  result: MatchResult;
  location: string;
}) {
  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-2xl border-2 border-indigo-700 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-2xl font-bold">🧭 Your Career Map</h2>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-800">
            Profile we picked up from your CV
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <ProfileStat label="Seniority" value={result.profile.seniority} />
            <ProfileStat
              label="Experience"
              value={`${result.profile.years_experience} yrs`}
            />
            <ProfileStat label="Industry" value={result.profile.primary_industry} />
            <ProfileStat
              label="Top skills"
              value={result.profile.top_skills.slice(0, 3).join(", ")}
            />
          </div>
        </div>
      </div>

      <TierSection
        title="🟢 Apply Today"
        subtitle="Strong fit right now"
        accent="border-green-500"
      >
        <div className="space-y-3">
          {result.apply_today.map((r, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="font-semibold text-neutral-900">{r.title}</div>
              <div className="mt-1 text-sm text-neutral-700">{r.why_you_fit}</div>
              <JobLinksRow role={r.title} location={location} />
            </div>
          ))}
        </div>
      </TierSection>

      <TierSection
        title="🟡 Stretch Roles"
        subtitle="One step up — close named gaps and you qualify"
        accent="border-amber-500"
      >
        <div className="space-y-3">
          {result.stretch_roles.map((r, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold text-neutral-900">{r.title}</div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {r.estimated_time_to_ready}
                </span>
              </div>
              <div className="mt-2 text-xs font-semibold uppercase text-neutral-500">
                What you&apos;re missing
              </div>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-neutral-700">
                {r.gaps.map((g, j) => <li key={j}>{g}</li>)}
              </ul>
              <JobLinksRow role={r.title} location={location} />
            </div>
          ))}
        </div>
      </TierSection>

      <TierSection
        title="🟣 Pivot Roles"
        subtitle="Adjacent paths you may not have considered"
        accent="border-purple-500"
      >
        <div className="space-y-3">
          {result.pivot_roles.map((r, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="font-semibold text-neutral-900">{r.title}</div>
              <div className="mt-1 text-sm text-neutral-700">{r.why_it_works}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.transferable_skills.map((s, j) => (
                  <span
                    key={j}
                    className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <JobLinksRow role={r.title} location={location} />
            </div>
          ))}
        </div>
      </TierSection>

      <div className="rounded-lg border border-neutral-200 bg-blue-50 p-4">
        <h3 className="mb-1 text-sm font-semibold text-blue-900">
          📊 Industry demand right now
        </h3>
        <p className="text-sm text-blue-900">{result.industry_demand}</p>
      </div>

      {result.target_role_gap && (
        <TargetRoleGapPanel gap={result.target_role_gap} location={location} />
      )}
    </section>
  );
}

function JobLinksRow({ role, location }: { role: string; location: string }) {
  const links = buildJobLinks(role, location);
  if (links.length === 0) return null;
  return (
    <div className="mt-3 border-t border-neutral-100 pt-3">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        See live openings
        {location.trim() ? ` · ${location.trim()}` : ""}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <a
            key={l.name}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 transition hover:border-indigo-400 hover:bg-indigo-100"
          >
            <span>{l.emoji}</span>
            <span>{l.name}</span>
            <span aria-hidden className="opacity-60">↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-neutral-500">{label}</div>
      <div className="font-medium text-neutral-900">{value}</div>
    </div>
  );
}

function TierSection({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border-l-4 ${accent} bg-neutral-50 p-4`}>
      <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
      <p className="mb-3 text-xs text-neutral-600">{subtitle}</p>
      {children}
    </div>
  );
}

function TargetRoleGapPanel({
  gap,
  location,
}: {
  gap: NonNullable<MatchResult["target_role_gap"]>;
  location: string;
}) {
  const severityColor: Record<string, string> = {
    critical: "bg-red-100 text-red-800 border-red-300",
    important: "bg-amber-100 text-amber-800 border-amber-300",
    nice_to_have: "bg-blue-100 text-blue-800 border-blue-300",
  };

  return (
    <div className="rounded-2xl border-2 border-indigo-700 bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-neutral-900">
          🎯 Your readiness for: {gap.target}
        </h3>
        <ScoreBadge score={gap.overall_readiness} label="Readiness" />
      </div>
      <p className="mb-4 text-sm text-neutral-700">{gap.summary}</p>
      <JobLinksRow role={gap.target} location={location} />
      <div className="mt-4 space-y-2">
        {gap.gaps.map((g, i) => (
          <div
            key={i}
            className={`rounded border p-3 ${severityColor[g.severity] ?? "border-neutral-300 bg-neutral-50"}`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">{g.skill}</div>
              <span className="text-xs font-bold uppercase">
                {g.severity.replace("_", " ")}
              </span>
            </div>
            <div className="mt-1 text-sm">{g.how_to_close}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AssessmentPanelProps {
  tone: Tone;
  setTone: (t: Tone) => void;
  assessCV: () => void;
  assessLoading: boolean;
  assessError: string | null;
  assessResult: RoastResult | null;
}

function AssessmentPanel({
  tone,
  setTone,
  assessCV,
  assessLoading,
  assessError,
  assessResult,
}: AssessmentPanelProps) {
  return (
    <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">📝 Want an honest CV assessment too?</h2>
      <p className="mt-1 mb-5 text-sm text-neutral-600">
        Optional. Get a section-by-section critique of your CV with a Resume Health Score.
      </p>

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

      <button
        onClick={assessCV}
        disabled={assessLoading}
        className="w-full rounded-lg bg-neutral-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {assessLoading ? "Reviewing your CV…" : "📝 Assess my CV"}
      </button>

      {assessError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {assessError}
        </div>
      )}

      {assessResult && <AssessResults result={assessResult} />}
    </section>
  );
}

function AssessResults({ result }: { result: RoastResult }) {
  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">The Verdict</h3>
          <ScoreBadge score={result.overall_score} label="Health Score" />
        </div>
        <p className="whitespace-pre-line text-neutral-700">
          {result.overall_roast}
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          ⓘ AI-estimated Resume Health Score, not a real ATS score. No public tool
          can read inside Greenhouse / Workday / Lever.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
        <h3 className="mb-3 text-lg font-bold">Top 3 Fixes</h3>
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

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
        <h3 className="mb-3 text-lg font-bold">Section by Section</h3>
        <div className="space-y-3">
          {result.sections.map((s) => (
            <div
              key={s.name}
              className="rounded-lg border border-neutral-200 bg-white p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold text-neutral-900">{s.name}</h4>
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
    </div>
  );
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
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
      <div className="mt-1 text-xs text-neutral-500">{label}</div>
    </div>
  );
}
