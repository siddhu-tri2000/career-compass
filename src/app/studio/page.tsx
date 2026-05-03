"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Target, AlertTriangle, BarChart3, FileText, Lightbulb, CheckCircle2, XCircle, Wrench, Sparkles, Lock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import CvInput from "@/components/CvInput";
import ExtrasInput from "@/components/ExtrasInput";
import FeedbackWidget from "@/components/FeedbackWidget";
import PageChrome from "@/components/PageChrome";
import ContentContainer from "@/components/ContentContainer";
import QuotaModal, { type QuotaState } from "@/components/QuotaModal";
import QuotaBadge from "@/components/QuotaBadge";
import JdSourceInput from "@/components/JdSourceInput";
import CoverLetterModal from "@/components/CoverLetterModal";
import type { PolishOutput, TailorOutput, BulletRewrite } from "@/lib/studioPrompts";
import {
  EMPTY_EXTRAS,
  mergeResumeWithExtras,
  readExtrasFromStorage,
  writeExtrasToStorage,
  type ResumeExtras,
} from "@/lib/mergeResume";

type Mode = "polish" | "tailor";

function StudioPageInner() {
  const search = useSearchParams();
  const initialJd = search.get("jd") ?? "";
  const initialMode: Mode = initialJd ? "tailor" : "polish";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState(initialJd);
  const [extras, setExtras] = useState<ResumeExtras>(EMPTY_EXTRAS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polishResult, setPolishResult] = useState<PolishOutput | null>(null);
  const [tailorResult, setTailorResult] = useState<TailorOutput | null>(null);
  const [quotaState, setQuotaState] = useState<QuotaState>(null);
  const [quotaRefresh, setQuotaRefresh] = useState(0);
  const hasResults = Boolean(polishResult || tailorResult);

  useEffect(() => {
    if (initialJd && !resume) {
      const cached = typeof window !== "undefined" ? localStorage.getItem("cc:lastResume:v1") : null;
      if (cached) setResume(cached);
    }
  }, [initialJd, resume]);

  // Hydrate extras (LinkedIn export + free-form notes) once on mount.
  useEffect(() => {
    setExtras(readExtrasFromStorage());
  }, []);

  // Persist whenever extras change so the home page sees the same value.
  useEffect(() => {
    writeExtrasToStorage(extras);
  }, [extras]);

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
      const mergedResume = mergeResumeWithExtras(resume, extras);
      const body = mode === "polish" ? { resume: mergedResume } : { resume: mergedResume, jd };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 401 && data?.code === "sign_in_required") {
        setQuotaState({ kind: "sign_in", tool: "studio" });
        return;
      }
      if (res.status === 402 && data?.code === "quota_exceeded") {
        setQuotaState({ kind: "waitlist", tool: "studio" });
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      if (mode === "polish") setPolishResult(data.result as PolishOutput);
      else setTailorResult(data.result as TailorOutput);
      setQuotaRefresh((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageChrome>
      <ContentContainer width="wide">
        {/* HEADER + MODE CONTROL — uses full canvas */}
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex">
              <span className="sticker text-purple-200">
                <span className="float-y inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-sm">
                  <span className="text-[10px]"><Wrench className="h-3 w-3" /></span>
                </span>
                <span>Resume Studio</span>
              </span>
            </div>
            <h1 className="hero-display pb-2">
              Make your CV{" "}
              <span className="relative inline-block whitespace-nowrap" style={{ WebkitTextFillColor: "#C4B5FD" }}>
                survive any ATS.
                <svg
                  aria-hidden
                  viewBox="0 0 220 14"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1.5 left-0 h-2.5 w-full text-amber-400/60"
                >
                  <path d="M2 9 C 60 2, 120 14, 218 5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
                </svg>
              </span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/65 sm:text-lg">
              Recruiter-grade rewrite + an honest ATS score in 30 seconds.
              Built on what Jobscan, Rezi, and Teal charge for —
              <span className="font-semibold text-white/90"> 5 free runs a day</span>.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="inline-flex items-center gap-1 rounded-2xl bg-white/[0.03] p-1.5 shadow-sm ring-1 ring-white/[0.08]">
              <button
                onClick={() => setMode("polish")}
                className={`squish inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition ${
                  mode === "polish"
                    ? "bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-md"
                    : "text-white/65 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>ATS Polish</span>
              </button>
              <button
                onClick={() => setMode("tailor")}
                className={`squish inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition ${
                  mode === "tailor"
                    ? "bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-md"
                    : "text-white/65 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <Target className="h-4 w-4" />
                <span>Tailor to JD</span>
              </button>
            </div>
            <p className="max-w-xs text-xs text-white/50 lg:text-right">
              {mode === "polish"
                ? "We'll rewrite your CV for any ATS — no specific job needed."
                : "We'll rewrite your CV for one specific job — paste the JD on the right."}
            </p>
          </div>
        </header>

        {/* INPUT GRID — 12-col, sticky helper aside */}
        <section className="grid gap-5 lg:grid-cols-12">
          {/* INPUT COLUMN */}
          <div className={`space-y-5 ${hasResults ? "lg:col-span-12" : "lg:col-span-8"}`}>
            <div className={`grid gap-5 ${mode === "tailor" ? "xl:grid-cols-2" : "grid-cols-1"}`}>
              <div className="bento glow-soft p-5 sm:p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="eyebrow">Your CV</span>
                  <span className="text-[11px] font-medium text-white/50">PDF · DOCX · TXT</span>
                </div>
                <CvInput value={resume} onChange={setResume} />
                <div className="mt-3">
                  <ExtrasInput value={extras} onChange={setExtras} />
                </div>
              </div>

              {mode === "tailor" && (
                <div className="bento surface-rose p-5 sm:p-6">
                  <JdSourceInput
                    value={jd}
                    onChange={setJd}
                    minChars={80}
                    maxChars={12_000}
                    rows={16}
                    label="Job description"
                    placeholder="Paste the full job description here — title, responsibilities, requirements, the works…"
                    textareaClassName="bg-[#0C0D10] leading-relaxed focus:border-purple-400 focus:ring-purple-100"
                  />
                  <p className="mt-2 text-xs text-white/50">
                    Tip: paste the whole posting — we use the requirements + nice-to-haves.
                  </p>
                </div>
              )}
            </div>

            {/* CTA bar — sits inside input column right below CV/JD */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0C0D10] p-3 backdrop-blur sm:p-4">
              <button
                onClick={run}
                disabled={loading}
                className="cta-sheen squish glow-purple inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 px-6 py-3.5 text-base font-bold text-white disabled:cursor-not-allowed disabled:from-neutral-300 disabled:via-neutral-300 disabled:to-neutral-300 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Analysing your CV…</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg leading-none">{mode === "polish" ? <Sparkles className="h-5 w-5" /> : <Target className="h-5 w-5" />}</span>
                    <span>{mode === "polish" ? "Polish my CV" : "Tailor my CV to this JD"}</span>
                    <span>→</span>
                  </>
                )}
              </button>
              <QuotaBadge tool="studio" refreshKey={quotaRefresh} />
              {error && (
                <div className="flex w-full items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* HELPER ASIDE — sticky on lg+, hidden once results land */}
          {!hasResults && (
            <aside className="space-y-4 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
              <div className="bento surface-lavender p-5">
                <span className="eyebrow">What you&apos;ll get</span>
                <ul className="mt-3 space-y-2.5 text-sm text-white/90">
                  <li className="flex gap-2.5">
                    <span className="float-y mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0C0D10] text-base shadow-sm ring-1 ring-white/[0.06]"><BarChart3 className="h-4 w-4" /></span>
                    <span><span className="font-semibold">ATS score 0–100</span> with category breakdown.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="float-y mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0C0D10] text-base shadow-sm ring-1 ring-white/[0.06]"><FileText className="h-4 w-4" /></span>
                    <span><span className="font-semibold">Bullet-by-bullet rewrites</span> — before vs after.</span>
                  </li>
                  {mode === "tailor" ? (
                    <>
                      <li className="flex gap-2.5">
                        <span className="float-y mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0C0D10] text-base shadow-sm ring-1 ring-white/[0.06]"><Target className="h-4 w-4" /></span>
                        <span><span className="font-semibold">JD keyword matrix</span> — which exact phrases you&apos;re missing.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="float-y mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0C0D10] text-base shadow-sm ring-1 ring-white/[0.06]"><FileText className="h-4 w-4" /></span>
                        <span><span className="font-semibold">Cover letter</span> in 3 tones, .docx download.</span>
                      </li>
                    </>
                  ) : (
                    <li className="flex gap-2.5">
                      <span className="float-y mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0C0D10] text-base shadow-sm ring-1 ring-white/[0.06]"><Lock className="h-4 w-4" /></span>
                      <span><span className="font-semibold">Universal ATS keywords</span> recruiters scan for in your role.</span>
                    </li>
                  )}
                  <li className="flex gap-2.5">
                    <span className="float-y mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0C0D10] text-base shadow-sm ring-1 ring-white/[0.06]"><FileText className="h-4 w-4" /></span>
                    <span><span className="font-semibold">.docx download</span> — single-column, ATS-safe.</span>
                  </li>
                </ul>
              </div>

              <div className="bento surface-mint p-5">
                <span className="eyebrow">Tips for best results</span>
                <ul className="mt-3 space-y-2 text-sm text-white/90">
                  <li className="flex gap-2"><span><CheckCircle2 className="h-3.5 w-3.5" /></span><span>Include <span className="font-semibold">numbers</span> wherever you can — %, ₹, headcount, time.</span></li>
                  <li className="flex gap-2"><span><CheckCircle2 className="h-3.5 w-3.5" /></span><span>Keep dates and titles intact — we won&apos;t invent any.</span></li>
                  {mode === "tailor" && (
                    <li className="flex gap-2"><span><CheckCircle2 className="h-3.5 w-3.5" /></span><span>Paste the <span className="font-semibold">full JD</span> (or use the URL fetch).</span></li>
                  )}
                  <li className="flex gap-2"><span><CheckCircle2 className="h-3.5 w-3.5" /></span><span>Use the <span className="font-semibold">Extras</span> field for wins your CV is missing.</span></li>
                </ul>
              </div>

              <div className="flex justify-center">
                <span className="sticker text-white/80">
                  <Lock className="h-4 w-4" />
                  <span>Sent to Gemini · <span className="font-semibold text-white">never stored</span>.</span>
                </span>
              </div>
            </aside>
          )}
        </section>

        {polishResult && <PolishResultsView result={polishResult} />}
        {tailorResult && (
          <TailorResultsView
            result={tailorResult}
            resume={resume}
            jd={jd}
            onQuotaBlocked={setQuotaState}
          />
        )}
      </ContentContainer>
      <QuotaModal state={quotaState} onClose={() => setQuotaState(null)} />
    </PageChrome>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/50">Loading…</div>}>
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
        <Panel title="Top suggestions" tone="amber">
          <ul className="list-inside list-disc space-y-1 text-sm text-white/90">
            {result.top_suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Panel>
      )}

      {result.rewritten_summary && (
        <Panel title="Rewritten professional summary" tone="indigo">
          <p className="text-sm leading-relaxed text-white/90">{result.rewritten_summary}</p>
          <CopyButton text={result.rewritten_summary} className="mt-3" />
        </Panel>
      )}

      <BulletDiffList bullets={result.rewritten_bullets} />

      <LatexExportButton polish={result} baseFilename="CareerCompass-ATS-Resume" />

      <FeedbackWidget
        surface="studio_polish"
        context={{ ats_score: result.ats_score?.overall }}
        label="Was this polish useful?"
      />
    </section>
  );
}

/* ==================== Tailor Results ==================== */

function TailorResultsView({
  result,
  resume,
  jd,
  onQuotaBlocked,
}: {
  result: TailorOutput;
  resume: string;
  jd: string;
  onQuotaBlocked: (state: QuotaState) => void;
}) {
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  return (
    <section className="mt-10 space-y-6">
      <ScoreCard
        score={result.match_score}
        title="JD Match Score"
        subtitle={result.match_reason}
        accent={result.match_score >= 80 ? "emerald" : result.match_score >= 60 ? "amber" : "red"}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <KeywordPanel title="Matched hard skills" chips={result.hard_skills_matched} tone="emerald" />
        <KeywordPanel title="Missing hard skills" chips={result.hard_skills_missing} tone="red" />
      </div>

      {(result.soft_skills_matched?.length > 0 || result.soft_skills_missing?.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <KeywordPanel title="Matched soft skills" chips={result.soft_skills_matched} tone="emerald" compact />
          <KeywordPanel title="Missing soft skills" chips={result.soft_skills_missing} tone="neutral" compact />
        </div>
      )}

      {result.ats_format_warnings?.length > 0 && (
        <Panel title="ATS format warnings" tone="amber">
          <ul className="list-inside list-disc space-y-1 text-sm text-white/90">
            {result.ats_format_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Panel>
      )}

      {result.rewritten_summary && (
        <Panel title="Tailored professional summary" tone="indigo">
          <p className="text-sm leading-relaxed text-white/90">{result.rewritten_summary}</p>
          <CopyButton text={result.rewritten_summary} className="mt-3" />
        </Panel>
      )}

      <BulletDiffList bullets={result.rewritten_bullets} />

      {result.cover_letter_hook && (
        <Panel title="Cover-letter / DM opening" tone="purple">
          <p className="text-sm italic leading-relaxed text-white/90">&ldquo;{result.cover_letter_hook}&rdquo;</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton text={result.cover_letter_hook} />
            <button
              type="button"
              onClick={() => setShowCoverLetter(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-purple-800 hover:to-indigo-800"
            >
              <FileText className="mr-1 inline h-3.5 w-3.5" /> Generate full cover letter →
            </button>
          </div>
        </Panel>
      )}

      <LatexExportButton tailor={result} baseFilename="CareerCompass-Tailored-Resume" />

      <FeedbackWidget
        surface="studio_tailor"
        context={{ match_score: result.match_score }}
        label="Did this tailoring help?"
      />

      <CoverLetterModal
        open={showCoverLetter}
        onClose={() => setShowCoverLetter(false)}
        resume={resume}
        jd={jd}
        candidateName={result.structured_resume?.full_name ?? null}
        onQuotaBlocked={onQuotaBlocked}
      />
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
    purple: "from-purple-400/10 to-transparent",
    emerald: "from-emerald-400/10 to-transparent",
    amber: "from-amber-400/10 to-transparent",
    red: "from-red-400/10 to-transparent",
  }[accent];
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circ;

  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-gradient-to-br ${bgGradient} p-5 shadow-sm`}>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
            <circle cx="60" cy="60" r={radius} className="fill-none stroke-white/10" strokeWidth="10" />
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
            <div className="text-3xl font-extrabold text-white">{score}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/50">/ 100</div>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-white/50">{title}</div>
          <p className="mt-1 text-base text-white/90">{subtitle}</p>
          {breakdown && breakdown.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {breakdown.map((b) => (
                <div key={b.label} className="rounded-lg bg-[#0C0D10] p-2 text-center shadow-inner">
                  <div className="text-lg font-bold text-white">{b.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">{b.label}</div>
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
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 shadow-sm">
      <div className="mb-3 text-sm font-bold uppercase tracking-wider text-white/50">ATS checklist</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((c) => (
          <div
            key={c.id}
            className={`flex items-start gap-2 rounded-lg border p-2 text-sm ${
              c.passed ? "border-emerald-400/20 bg-emerald-400/10" : "border-red-400/30 bg-red-400/10"
            }`}
          >
            <span className="mt-0.5">{c.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}</span>
            <div className="flex-1">
              <div className="font-semibold text-white">{c.label}</div>
              <div className="text-xs text-white/65">{c.hint}</div>
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
    emerald: "border-emerald-400/20 bg-emerald-400/10",
    red: "border-red-400/30 bg-red-400/10",
    neutral: "border-white/[0.08] bg-white/[0.03]",
  }[tone];
  const chipBase =
    tone === "emerald"
      ? "bg-emerald-400/20 text-emerald-200"
      : tone === "red"
        ? "bg-red-400/10 text-red-300"
        : "bg-white/[0.08] text-white/90";
  const chipStrong =
    tone === "emerald"
      ? "bg-emerald-700 text-white"
      : tone === "red"
        ? "bg-red-700 text-white"
        : "bg-neutral-700 text-white";

  return (
    <div className={`rounded-2xl border ${palette} p-4 shadow-sm`}>
      <div className="mb-2 text-sm font-bold text-white">{title}</div>
      {chips.length === 0 ? (
        <div className="text-xs text-white/50">None.</div>
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
    indigo: "border-indigo-400/20 bg-indigo-400/10",
    purple: "border-purple-400/20 bg-purple-400/10",
    amber: "border-amber-400/20 bg-amber-400/10",
  }[tone];
  return (
    <div className={`rounded-2xl border ${palette} p-5 shadow-sm`}>
      <div className="mb-2 text-sm font-bold uppercase tracking-wider text-white/80">{title}</div>
      {children}
    </div>
  );
}

function BulletDiffList({ bullets }: { bullets: BulletRewrite[] }) {
  if (!bullets?.length) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-extrabold text-white"><Sparkles className="mr-1 inline h-5 w-5" /> Rewritten bullets</h2>
      <div className="space-y-3">
        {bullets.map((b, i) => (
          <article key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-white/50">{b.section}</div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div className="rounded-lg bg-white/[0.03] p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">Before</div>
                <div className="mt-1 text-sm leading-relaxed text-white/80 line-through decoration-neutral-300">
                  {b.original}
                </div>
              </div>
              <div className="rounded-lg bg-emerald-400/10 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">After</div>
                <div className="mt-1 text-sm leading-relaxed font-medium text-white">{b.rewritten}</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-white/50"><Lightbulb className="mr-0.5 inline h-3 w-3" /> {b.why_better}</p>
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
      className={`inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-xs font-semibold text-white/80 hover:border-white/25 ${className}`}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

/* ==================== Download .docx ==================== */

function LatexExportButton({
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

  async function fetchLatex(): Promise<string | null> {
    if (!structured) return null;
    const res = await fetch("/api/studio/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structured_resume: structured, filename: baseFilename }),
    });
    if (!res.ok) return null;
    return res.text();
  }

  async function handleDownload() {
    if (!structured) return;
    setDownloading(true);
    try {
      const latex = await fetchLatex();
      if (!latex) throw new Error("Download failed");
      const blob = new Blob([latex], { type: "application/x-tex; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseFilename}.tex`;
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

  function handleOverleaf() {
    if (!structured) return;
    // Fetch LaTeX then submit via form POST to Overleaf
    fetchLatex().then((latex) => {
      if (!latex) {
        alert("Failed to generate LaTeX. Try again.");
        return;
      }
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://www.overleaf.com/docs";
      form.target = "_blank";
      const input = document.createElement("textarea");
      input.name = "snip";
      input.value = latex;
      input.style.display = "none";
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      form.remove();
    });
  }

  if (!structured) return null;

  return (
    <div className="rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-400/10 to-indigo-400/10 p-5 shadow-sm">
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-base font-bold text-white"><FileText className="mr-1 inline h-4 w-4" /> Export ATS-optimized resume</div>
          <p className="text-sm text-white/80">
            LaTeX source — compiles to a pixel-perfect, single-column PDF that every ATS parses flawlessly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-purple-800 disabled:opacity-60"
          >
            {downloading ? "Preparing…" : "Download .tex"}
          </button>
          <button
            onClick={handleOverleaf}
            className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-2.5 text-sm font-bold text-emerald-200 shadow-md hover:bg-emerald-400/20"
          >
            Open in Overleaf →
          </button>
        </div>
        <p className="text-xs text-white/50">
          Paste into <a href="https://www.overleaf.com" target="_blank" rel="noreferrer" className="underline hover:text-white/70">Overleaf</a> to compile to PDF instantly. No account needed for viewing.
        </p>
      </div>
    </div>
  );
}
