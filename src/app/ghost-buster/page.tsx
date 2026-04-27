"use client";
import { Compass, Ghost, Search, Flag, CheckCircle2, AlertTriangle, XCircle, Target, MessageCircle, Wrench } from "lucide-react";

import { useEffect, useState } from "react";
import Link from "next/link";
import FeedbackWidget from "@/components/FeedbackWidget";
import PageChrome from "@/components/PageChrome";
import ContentContainer from "@/components/ContentContainer";
import QuotaModal, { type QuotaState } from "@/components/QuotaModal";
import QuotaBadge from "@/components/QuotaBadge";
import JdSourceInput from "@/components/JdSourceInput";
import type { GhostDetectResult, GhostDiagnoseResult } from "@/lib/prompts";

type Mode = "detect" | "diagnose";

const DRAFT_KEY = "cc:draft:v1";
const GHOST_DRAFT_KEY = "cc:ghost-draft:v1";

export default function GhostBusterPage() {
  const [mode, setMode] = useState<Mode>("detect");
  const [jd, setJd] = useState("");
  const [cv, setCv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectResult, setDetectResult] = useState<GhostDetectResult | null>(null);
  const [diagnoseResult, setDiagnoseResult] = useState<GhostDiagnoseResult | null>(null);
  const [quotaState, setQuotaState] = useState<QuotaState>(null);
  const [quotaRefresh, setQuotaRefresh] = useState(0);

  // Restore drafts
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GHOST_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.jd === "string") setJd(parsed.jd);
        if (typeof parsed.mode === "string") setMode(parsed.mode === "diagnose" ? "diagnose" : "detect");
      }
      const cvDraft = localStorage.getItem(DRAFT_KEY);
      if (cvDraft) {
        const parsed = JSON.parse(cvDraft);
        if (typeof parsed.resume === "string") setCv(parsed.resume);
      }
    } catch {}
  }, []);

  // Autosave JD draft
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(GHOST_DRAFT_KEY, JSON.stringify({ jd, mode }));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [jd, mode]);

  const jdChars = jd.length;
  const cvChars = cv.length;
  const jdTooShort = jdChars < 80;
  const cvTooShort = cvChars < 200;
  const canSubmit =
    !loading && !jdTooShort && (mode === "detect" || !cvTooShort);

  async function run() {
    setLoading(true);
    setError(null);
    setDetectResult(null);
    setDiagnoseResult(null);
    try {
      const res = await fetch("/api/ghost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, jd, cv: mode === "diagnose" ? cv : undefined }),
      });
      const data = await res.json();
      if (res.status === 401 && data?.code === "sign_in_required") {
        setQuotaState({ kind: "sign_in", tool: "ghost" });
        return;
      }
      if (res.status === 402 && data?.code === "quota_exceeded") {
        setQuotaState({ kind: "waitlist", tool: "ghost" });
        return;
      }
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      if (data.mode === "detect") setDetectResult(data.result);
      else setDiagnoseResult(data.result);
      setQuotaRefresh((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageChrome>
    <ContentContainer>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] -mx-4 sm:-mx-6">
        <div className="mesh-soft" />
      </div>

      {/* Hero */}
      <header className="pt-6 pb-6 text-center sm:pt-10">
        <div className="fade-up mb-4 inline-flex items-center gap-1.5 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-200 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-600" />
          New · World&apos;s first ghost-job feedback loop
        </div>
        <h1 className="hero-display fade-up fade-up-delay-1 pb-2">
          <span className="inline-flex items-center gap-3">
            <Ghost className="h-10 w-10 text-purple-300" strokeWidth={1.5} />
            JD Ghost Buster
          </span>
        </h1>
        <p className="fade-up fade-up-delay-2 mx-auto mt-3 max-w-2xl text-base text-white/65 sm:text-lg">
          Stop wasting hours on fake job posts. Stop wondering why you got ghosted. Get the brutally honest answers no recruiter ever gives you.
        </p>
      </header>

      {/* Mode toggle — sticky once scrolling so context never gets lost */}
      <div className="fade-up fade-up-delay-3 sticky top-2 z-20 mb-6 flex justify-center">
        <div className="inline-flex rounded-xl border-2 border-white/[0.08] bg-[#0C0D10] p-1 shadow-md backdrop-blur">
          <button
            onClick={() => setMode("detect")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === "detect"
                ? "bg-purple-700 text-white shadow"
                : "text-white/80 hover:bg-white/[0.05]"
            }`}
          >
            <Ghost className="h-3.5 w-3.5" strokeWidth={2} />
            Is this a ghost job?
          </button>
          <button
            onClick={() => setMode("diagnose")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === "diagnose"
                ? "bg-purple-700 text-white shadow"
                : "text-white/80 hover:bg-white/[0.05]"
            }`}
          >
            <Search className="h-3.5 w-3.5" strokeWidth={2} />
            Why was I ghosted?
          </button>
        </div>
      </div>

      {/* Input panel */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0C0D10] p-5 shadow-xl shadow-black/40 backdrop-blur sm:p-7">
        <JdSourceInput
          value={jd}
          onChange={(v) => setJd(v.slice(0, 12_000))}
          minChars={80}
          maxChars={12_000}
          rows={10}
          label={mode === "detect" ? "Paste the job description" : "Paste the JD you applied to"}
          placeholder="Paste the full job description here — title, responsibilities, requirements, salary, location, everything…"
        />

        {mode === "diagnose" && (
          <>
            <label className="mt-5 mb-2 block text-sm font-semibold text-white/90">
              Paste your CV
              <span className="ml-2 font-normal text-white/50">
                ({cvChars.toLocaleString()} chars{cvTooShort ? " · need ≥ 200" : ""})
              </span>
            </label>
            <textarea
              value={cv}
              onChange={(e) => setCv(e.target.value.slice(0, 25_000))}
              placeholder="Paste your full CV / resume text here…"
              className="h-56 w-full resize-y rounded-lg border border-white/[0.1] bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/35 focus:border-purple-700 focus:bg-white/[0.03] focus:outline-none"
            />
            {cv && (
              <p className="mt-1 text-xs text-white/50">
                Tip: your CV draft from the main map is auto-loaded if you have one.
              </p>
            )}
          </>
        )}

        <button
          onClick={run}
          disabled={!canSubmit}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-purple-900/40 transition hover:from-purple-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-purple-800/50 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-white/[0.06] disabled:to-white/[0.06] disabled:text-white/30 disabled:shadow-none"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {mode === "detect" ? "Sniffing for ghost signals…" : "Diagnosing the rejection…"}
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-2">
              {mode === "detect" ? <Ghost className="h-4 w-4" strokeWidth={2} /> : <Search className="h-4 w-4" strokeWidth={2} />}
              {mode === "detect" ? "Bust this JD" : "Diagnose the ghosting"}
              <span className="text-white/60">→</span>
            </span>
          )}
        </button>

        <div className="mt-3 flex justify-center">
          <QuotaBadge tool="ghost" refreshKey={quotaRefresh} />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
            <div className="font-semibold">Couldn&apos;t analyse this.</div>
            <div className="mt-1 text-red-300/80">{error}</div>
          </div>
        )}
      </section>

      {/* Results */}
      {detectResult && <DetectResultCard r={detectResult} />}
      {diagnoseResult && <DiagnoseResultCard r={diagnoseResult} />}
      {(detectResult || diagnoseResult) && (
        <div className="mx-auto mt-6 max-w-3xl px-4">
          <FeedbackWidget
            surface={detectResult ? "ghost_detect" : "ghost_diagnose"}
            context={{
              verdict: detectResult?.verdict,
              trust_score: detectResult?.trust_score,
            }}
            label="Did this analysis help?"
          />
        </div>
      )}

      <QuotaModal state={quotaState} onClose={() => setQuotaState(null)} />
    </ContentContainer>
    </PageChrome>
  );
}

/* ---------- DETECT RESULT ---------- */

function DetectResultCard({ r }: { r: GhostDetectResult }) {
  const verdictColor =
    r.verdict === "real"
      ? "from-green-600 to-emerald-700"
      : r.verdict === "sketchy"
        ? "from-amber-500 to-orange-600"
        : "from-red-600 to-rose-700";
  const VerdictIcon = r.verdict === "real" ? CheckCircle2 : r.verdict === "sketchy" ? AlertTriangle : XCircle;
  const verdictLabel =
    r.verdict === "real"
      ? "Looks real — apply with confidence"
      : r.verdict === "sketchy"
        ? "Sketchy — read carefully"
        : "Likely ghost — save your time";

  return (
    <section className="fade-up mt-8 rounded-2xl border border-white/[0.08] bg-[#0C0D10] p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
      {/* Verdict banner */}
      <div className={`mb-5 rounded-xl bg-gradient-to-r p-5 text-white shadow-lg ${verdictColor}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-90">Verdict</div>
            <div className="mt-1 flex items-center gap-2 text-xl font-extrabold sm:text-2xl">
              <VerdictIcon className="h-5 w-5 shrink-0" strokeWidth={2.5} />
              {verdictLabel}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-90">Trust</div>
            <div className="text-3xl font-extrabold sm:text-4xl">{r.trust_score}<span className="text-lg opacity-70">/100</span></div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed opacity-95">{r.verdict_summary}</p>
      </div>

      {/* Flags */}
      <div className="mb-5">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-white/80">
          <Flag className="h-3.5 w-3.5" strokeWidth={2} />
          What we found
        </h3>
        <div className="space-y-2">
          {r.flags.map((f, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 ${
                f.type === "red"
                  ? "border-red-400/20 bg-red-400/10"
                  : "border-emerald-400/20 bg-emerald-400/10"
              }`}
            >
              <div className="flex items-start gap-2">
                {f.type === "red" ? (
                  <Flag className="mt-0.5 h-4 w-4 shrink-0 text-red-400" strokeWidth={2} />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2} />
                )}
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold ${f.type === "red" ? "text-red-200" : "text-emerald-200"}`}>
                    {f.label}
                  </div>
                  <div className={`mt-0.5 text-sm ${f.type === "red" ? "text-red-300/80" : "text-emerald-300/80"}`}>
                    {f.detail}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/10 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
          <Compass className="h-3.5 w-3.5" strokeWidth={2} />
          Recommendation
        </div>
        <p className="text-sm leading-relaxed text-indigo-200/90">{r.recommendation}</p>
      </div>
    </section>
  );
}

/* ---------- DIAGNOSE RESULT ---------- */

function DiagnoseResultCard({ r }: { r: GhostDiagnoseResult }) {
  const fitColor =
    r.fit_score >= 70
      ? "from-green-600 to-emerald-700"
      : r.fit_score >= 40
        ? "from-amber-500 to-orange-600"
        : "from-red-600 to-rose-700";

  const sevColor = (s: "high" | "medium" | "low") =>
    s === "high"
      ? "border-red-400/20 bg-red-400/10 text-red-200"
      : s === "medium"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
        : "border-white/[0.1] bg-white/[0.03] text-white/90";

  return (
    <section className="fade-up mt-8 rounded-2xl border border-white/[0.08] bg-[#0C0D10] p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
      {/* Fit banner */}
      <div className={`mb-5 rounded-xl bg-gradient-to-r p-5 text-white shadow-lg ${fitColor}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-90">CV ↔ JD Fit</div>
            <div className="mt-1 text-xl font-extrabold sm:text-2xl">{r.fit_summary}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-90">Score</div>
            <div className="text-3xl font-extrabold sm:text-4xl">
              {r.fit_score}<span className="text-lg opacity-70">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection reasons */}
      <div className="mb-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-white/80">
          <Target className="h-3.5 w-3.5" strokeWidth={2} />
          Why you were probably ghosted
        </h3>
        <div className="space-y-2">
          {r.rejection_reasons.map((rr, i) => (
            <div key={i} className={`rounded-lg border p-3 ${sevColor(rr.severity)}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">
                  {i + 1}. {rr.reason}
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-bold uppercase text-white/60">
                  {rr.severity}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed opacity-90">{rr.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fixes */}
      <div className="mb-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-white/80">
          <Wrench className="h-3.5 w-3.5" strokeWidth={2} />
          How to fix it
        </h3>
        <div className="space-y-2">
          {r.fixes.map((f, i) => (
            <div key={i} className="rounded-lg border border-indigo-400/20 bg-indigo-400/10 p-3">
              <div className="flex items-start gap-2">
                <span className="font-bold text-indigo-300">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-indigo-200">{f.action}</div>
                  {f.example && (
                    <div className="mt-1 rounded border border-white/[0.06] bg-white/[0.03] p-2 text-sm text-white/70">
                      <span className="text-xs font-bold uppercase text-indigo-400">Example: </span>
                      {f.example}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Honest verdict */}
      <div className="rounded-xl border border-purple-400/20 bg-purple-400/10 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-300">
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
          The honest truth
        </div>
        <p className="text-sm leading-relaxed text-purple-200/90">{r.honest_verdict}</p>
      </div>
    </section>
  );
}
