"use client";

import { useEffect, useState } from "react";
import type {
  MatchResult,
  RoastResult,
  Tone,
  LearningResource,
} from "@/lib/prompts";
import LiveJobsPanel from "@/components/LiveJobsPanel";
import ShareModal from "@/components/ShareModal";
import PageChrome from "@/components/PageChrome";
import UserMenu from "@/components/UserMenu";
import CvInput from "@/components/CvInput";
import ExtrasInput from "@/components/ExtrasInput";
import AuthModal from "@/components/AuthModal";
import FeedbackWidget from "@/components/FeedbackWidget";
import QuotaModal, { type QuotaState } from "@/components/QuotaModal";
import QuotaBadge from "@/components/QuotaBadge";
import { Compass, Map, Wrench, Mountain, Share2, Ghost, Target, Zap, Lock, AlertTriangle, FileText, BarChart3, Link2, Lightbulb, CheckCircle2, XCircle, BookmarkPlus, MapPin } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import {
  EMPTY_EXTRAS,
  mergeResumeWithExtras,
  readExtrasFromStorage,
  writeExtrasToStorage,
  type ResumeExtras,
} from "@/lib/mergeResume";

const SITE_URL = "https://career-compass-orpin-tau.vercel.app";
const DRAFT_KEY = "cc:draft:v1";

const PROGRESS_STEPS = [
  "Reading your CV…",
  "Spotting roles you can apply for today…",
  "Mapping stretch & pivot paths…",
  "Checking India market demand…",
  "Almost there — formatting your map…",
];

const TONES: Array<{ id: Tone; label: string; sub: string }> = [
  { id: "honest", label: "Direct", sub: "Professional & clear" },
  { id: "encouraging", label: "Supportive", sub: "Constructive" },
  { id: "roast", label: "Punchy", sub: "Funny & sharp" },
];

const TRUST_PILL_ICONS = [Zap, Lock, Lock, MapPin] as const;
const TRUST_PILLS = [
  { label: "30-second results" },
  { label: "CV never stored" },
  { label: "Sign in · 5 runs/day" },
  { label: "India-aware" },
];

const EXAMPLE_ROLES = [
  { color: "bg-emerald-400", title: "Senior Backend Engineer · Fintech" },
  { color: "bg-amber-400", title: "Engineering Manager · SaaS" },
  { color: "bg-purple-400", title: "Product Manager · D2C" },
  { color: "bg-emerald-400", title: "Solutions Architect · Cloud" },
  { color: "bg-amber-400", title: "Tech Lead · Payments" },
  { color: "bg-purple-400", title: "AI Product Manager · GenAI" },
];

type Tab = "apply" | "stretch" | "pivot" | "target" | "assess";

export default function HomePage() {
  const [resume, setResume] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [location, setLocation] = useState("");
  const [extras, setExtras] = useState<ResumeExtras>(EMPTY_EXTRAS);
  const [shareOpen, setShareOpen] = useState(false);

  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const [tone, setTone] = useState<Tone>("honest");
  const [assessLoading, setAssessLoading] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);
  const [assessResult, setAssessResult] = useState<RoastResult | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("apply");
  const [progressIdx, setProgressIdx] = useState(0);
  const [quotaState, setQuotaState] = useState<QuotaState>(null);
  const [quotaRefresh, setQuotaRefresh] = useState(0);

  // --- Autosave: hydrate from localStorage on mount ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        resume?: string;
        targetRole?: string;
        location?: string;
      };
      if (draft.resume) setResume(draft.resume);
      if (draft.targetRole) setTargetRole(draft.targetRole);
      if (draft.location) setLocation(draft.location);
    } catch {
      /* ignore */
    }
    // Hydrate the extras (LinkedIn export + free-form notes) from its own key.
    setExtras(readExtrasFromStorage());
  }, []);

  // Persist extras whenever they change.
  useEffect(() => {
    writeExtrasToStorage(extras);
  }, [extras]);

  // --- Autosave: persist on change (debounced) ---
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ resume, targetRole, location }),
        );
      } catch {
        /* ignore quota */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [resume, targetRole, location]);

  // --- Rotating progress messages while matching ---
  useEffect(() => {
    if (!matchLoading) {
      setProgressIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setProgressIdx((i) => Math.min(i + 1, PROGRESS_STEPS.length - 1));
    }, 2800);
    return () => clearInterval(interval);
  }, [matchLoading]);

  async function mapCareer() {
    setMatchLoading(true);
    setMatchError(null);
    setAssessResult(null);
    setAssessError(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: mergeResumeWithExtras(resume, extras),
          target_role: targetRole.trim() || null,
          location: location.trim() || null,
        }),
      });
      const data = (await res.json()) as { result?: MatchResult; error?: string; code?: string };
      if (res.status === 401 && data.code === "sign_in_required") {
        setQuotaState({ kind: "sign_in", tool: "map" });
        return;
      }
      if (res.status === 402 && data.code === "quota_exceeded") {
        setQuotaState({ kind: "waitlist", tool: "map" });
        return;
      }
      if (!res.ok || !data.result) {
        setMatchError(data.error ?? "Something went wrong.");
      } else {
        setMatchResult(data.result);
        setQuotaRefresh((n) => n + 1);
        try {
          const p = data.result.profile;
          localStorage.setItem(
            "cc:profile:v1",
            JSON.stringify({
              seniority: p.seniority,
              industry: p.primary_industry,
              location: location.trim() || undefined,
              top_skills: p.top_skills,
            }),
          );
        } catch {
          // ignore storage errors
        }
        setActiveTab("apply");
        setTimeout(
          () => window.scrollTo({ top: 0, behavior: "smooth" }),
          50,
        );
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
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: mergeResumeWithExtras(resume, extras), tone }),
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

  function startOver() {
    setMatchResult(null);
    setAssessResult(null);
    setMatchError(null);
    setAssessError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const charCount = resume.length;
  const tooShort = charCount > 0 && charCount < 200;
  const hasResults = matchResult !== null;

  return (
    <PageChrome navExtra={
        <>
          {hasResults && (
            <button
              onClick={startOver}
              aria-label="New search"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] bg-transparent px-2.5 py-1.5 text-[13px] font-medium text-white/70 transition hover:border-white/25 hover:text-white"
            >
              <span>←</span>
              <span className="hidden sm:inline">New search</span>
            </button>
          )}
          <button
            onClick={() => setShareOpen(true)}
            aria-label="Share"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-white/[0.1]"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </>
      }>
      <div className="relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]">
        <div className="mesh-soft" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {!hasResults ? (
          <LandingView
            resume={resume}
            setResume={setResume}
            targetRole={targetRole}
            setTargetRole={setTargetRole}
            location={location}
            setLocation={setLocation}
            extras={extras}
            setExtras={setExtras}
            charCount={charCount}
            tooShort={tooShort}
            matchLoading={matchLoading}
            matchError={matchError}
            mapCareer={mapCareer}
            progressIdx={progressIdx}
            quotaRefresh={quotaRefresh}
          />
        ) : (
          <>
            <ResultsView
              result={matchResult!}
              location={location}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tone={tone}
              setTone={setTone}
              assessCV={assessCV}
              assessLoading={assessLoading}
              assessError={assessError}
              assessResult={assessResult}
              startOver={startOver}
              onShare={() => setShareOpen(true)}
            />
            <div className="mx-auto mt-8 max-w-4xl px-4">
              <FeedbackWidget
                surface="map"
                context={{
                  industry: matchResult?.profile?.primary_industry,
                  seniority: matchResult?.profile?.seniority,
                }}
                label="Did this map feel right for you?"
              />
            </div>
          </>
        )}
      </div>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} url={buildShareUrl(matchResult)} />
      {hasResults && <SoftLoginToast />}
      <QuotaModal state={quotaState} onClose={() => setQuotaState(null)} />
      </div>
    </PageChrome>
  );
}

function buildShareUrl(result: MatchResult | null): string {
  if (!result) return SITE_URL;
  const top = result.apply_today?.[0];
  if (!top) return SITE_URL;
  const params = new URLSearchParams();
  params.set("r", top.title.slice(0, 60));
  if (result.profile?.seniority) params.set("l", String(result.profile.seniority).slice(0, 30));
  const skills = (result.profile?.top_skills ?? []).slice(0, 5).join(",");
  if (skills) params.set("t", skills.slice(0, 200));
  return `${SITE_URL}/s?${params.toString()}`;
}

/* ---------- LANDING VIEW ---------- */

interface LandingProps {
  resume: string;
  setResume: (v: string) => void;
  targetRole: string;
  setTargetRole: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  extras: ResumeExtras;
  setExtras: (v: ResumeExtras) => void;
  charCount: number;
  tooShort: boolean;
  matchLoading: boolean;
  matchError: string | null;
  mapCareer: () => void;
  progressIdx: number;
  quotaRefresh: number;
}

function LandingView(p: LandingProps) {
  return (
    <>
      <header className="pt-12 pb-10 text-center sm:pt-20">
        {/* Badge sticker */}
        <div className="fade-up mb-5 inline-flex">
          <span className="sticker text-indigo-200">
            <span className="float-y inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-sm">
              <span className="text-[10px]">✦</span>
            </span>
            <span>Powered by Google Gemini</span>
            <span className="text-white/20">·</span>
            <span className="text-emerald-300">5 free runs/day</span>
          </span>
        </div>

        {/* Headline with playful highlight */}
        <h1 className="fade-up fade-up-delay-1 hero-display mx-auto max-w-4xl pb-2">
          Find the roles you{" "}
          <span className="relative inline-block whitespace-nowrap" style={{ color: "#A5B4FC", WebkitTextFillColor: "#A5B4FC" }}>
            should actually
            <svg
              aria-hidden
              viewBox="0 0 220 14"
              preserveAspectRatio="none"
              className="absolute -bottom-1 left-0 h-2.5 w-full text-amber-300/70"
            >
              <path d="M2 9 C 60 2, 120 14, 218 5" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
            </svg>
          </span>{" "}
          apply for.
        </h1>

        <p className="fade-up fade-up-delay-2 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
          Drop your CV. In 30 seconds you get a personalised career map —
          <span className="font-semibold text-white/90"> roles you fit today</span>,
          <span className="font-semibold text-white/90"> stretch roles 1–2 steps away</span>, and
          <span className="font-semibold text-white/90"> adjacent paths</span> you hadn&apos;t considered.
        </p>

        {/* Trust stickers — each in its own pastel */}
        <div className="fade-up fade-up-delay-3 mt-7 flex flex-wrap items-center justify-center gap-2">
          {TRUST_PILLS.map((pill, i) => {
            const PillIcon = TRUST_PILL_ICONS[i];
            const palette = [
              "text-amber-200 ring-1 ring-amber-200/70 bg-amber-400/10",
              "text-sky-200 ring-1 ring-sky-200/70 bg-sky-400/10",
              "text-emerald-200 ring-1 ring-emerald-200/70 bg-emerald-400/10",
              "text-rose-200 ring-1 ring-rose-200/70 bg-rose-400/10",
            ][i % 4];
            return (
              <span key={pill.label} className={`sticker ${palette}`}>
                <PillIcon className="h-3.5 w-3.5" />
                <span>{pill.label}</span>
              </span>
            );
          })}
        </div>

        {/* Marquee — softer, taller, more sticker-y */}
        <div className="marquee-pause fade-up fade-up-delay-3 mt-9 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="marquee gap-2.5">
            {[...EXAMPLE_ROLES, ...EXAMPLE_ROLES].map((r, i) => (
              <span
                key={i}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0C0D10] px-3.5 py-1.5 text-xs font-medium text-white/80 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_18px_-10px_rgba(99,102,241,0.25)] ring-1 ring-white/[0.08] backdrop-blur"
              >
                <span className={`inline-block h-2 w-2 rounded-full ${r.color}`} />
                <span>{r.title}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Ghost Buster cross-link — clean indigo hairline */}
        <div className="fade-up fade-up-delay-3 mt-8 flex justify-center">
          <a
            href="/ghost-buster"
            className="group squish inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 no-underline transition hover:border-[#A5B4FC]/40 hover:bg-white/[0.05] hover:text-white"
          >
            <Ghost className="h-3.5 w-3.5 text-[#A5B4FC]" />
            <span>
              <span className="text-white/55">New</span>{" "}
              <span className="font-semibold text-white">JD Ghost Buster</span>
              <span className="text-white/55"> — find out why you&apos;re being ghosted</span>
            </span>
            <span className="text-[#A5B4FC] transition group-hover:translate-x-0.5">→</span>
          </a>
        </div>

        <div className="mx-auto mt-6 max-w-3xl text-left">
          <DailyPulseCard />
        </div>
      </header>

      {/* ============ INPUT BENTO ============ */}
      {/* Outcomes preview — horizontal chip row replacing sidebar */}
      <div className="mb-5 flex flex-wrap items-center justify-center gap-2 px-2 text-sm">
        <span className="text-white/50">You&apos;ll get:</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-200/70"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Apply Today</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-200/70"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Stretch</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-200 ring-1 ring-purple-200/70"><span className="inline-block h-2 w-2 rounded-full bg-purple-400" /> Pivot</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200 ring-1 ring-sky-200/70"><Target className="h-3 w-3" /> Target gap</span>
      </div>

      {/* Focused input bento — single column, centred */}
      <div className="mx-auto max-w-3xl">
        <section className="bento glow-indigo p-6 sm:p-8">
          <div className="mb-5 flex items-center justify-between">
            <span className="eyebrow">Get your map</span>
            <span className="hidden text-[11px] font-medium text-white/50 sm:inline">
              <Zap className="mr-1 inline h-3 w-3" />Takes ~30 seconds
            </span>
          </div>

          <CvInput value={p.resume} onChange={p.setResume} />

          <div className="mt-3">
            <ExtrasInput value={p.extras} onChange={p.setExtras} />
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="targetRole"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-white/90"
              >
                <Target className="h-4 w-4" />
                Target role
                <span className="font-normal text-white/35">· optional</span>
              </label>
              <input
                id="targetRole"
                type="text"
                value={p.targetRole}
                onChange={(e) => p.setTargetRole(e.target.value)}
                placeholder="e.g. Senior Product Manager"
                maxLength={100}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/35 transition focus:border-indigo-400 focus:bg-white/[0.03] focus:outline-none focus:ring-4 focus:ring-indigo-400/20"
              />
            </div>
            <div>
              <label
                htmlFor="location"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-white/90"
              >
                <MapPin className="h-4 w-4" />
                Preferred location
                <span className="font-normal text-white/35">· optional</span>
              </label>
              <input
                id="location"
                type="text"
                value={p.location}
                onChange={(e) => p.setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Remote, London"
                maxLength={60}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/35 transition focus:border-indigo-400 focus:bg-white/[0.03] focus:outline-none focus:ring-4 focus:ring-indigo-400/20"
              />
            </div>
          </div>

          <button
            onClick={p.mapCareer}
            disabled={p.matchLoading || p.charCount < 200}
            className="cta-sheen squish glow-indigo mt-7 w-full rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-6 py-4 text-base font-bold text-white transition hover:from-indigo-700 hover:via-indigo-800 hover:to-purple-800 disabled:cursor-not-allowed disabled:from-neutral-300 disabled:via-neutral-300 disabled:to-neutral-300 disabled:shadow-none"
          >
            {p.matchLoading ? (
              <span className="inline-flex items-center gap-2.5">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                <span>{PROGRESS_STEPS[p.progressIdx]}</span>
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <Compass className="h-5 w-5" />
                <span>Map my career</span>
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
              </span>
            )}
          </button>

          <div className="mt-3 flex justify-center">
            <QuotaBadge tool="map" refreshKey={p.quotaRefresh} />
          </div>

          {p.matchError && (
            <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold">Couldn&apos;t map your career.</div>
                  <div className="mt-1 text-red-400/90">{p.matchError}</div>
                  <button
                    onClick={p.mapCareer}
                    className="squish mt-2 rounded-lg border border-red-400/30 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-400/10"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="mt-12 flex justify-center">
        <div className="sticker text-white/80">
          <Lock className="h-4 w-4" />
          <span>
            Your CV is sent to Gemini for analysis and{" "}
            <span className="font-semibold text-white">never stored</span> on our servers.
          </span>
        </div>
      </div>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  text,
  surface,
}: {
  icon: string;
  title: string;
  text: string;
  surface: string;
}) {
  return (
    <div className={`squish rounded-2xl p-4 ${surface}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className="float-y inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0C0D10] text-xl shadow-sm ring-1 ring-white/[0.06]">
          {icon}
        </span>
        <span className="font-bold text-white">{title}</span>
      </div>
      <p className="text-sm leading-snug text-white/80">{text}</p>
    </div>
  );
}

/* ---------- RESULTS VIEW (2-COLUMN) ---------- */

interface ResultsProps {
  result: MatchResult;
  location: string;
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  tone: Tone;
  setTone: (t: Tone) => void;
  assessCV: () => void;
  assessLoading: boolean;
  assessError: string | null;
  assessResult: RoastResult | null;
  startOver: () => void;
  onShare: () => void;
}

function ResultsView(p: ResultsProps) {
  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "apply", label: "Apply Today", count: p.result.apply_today.length },
    { id: "stretch", label: "Stretch", count: p.result.stretch_roles.length },
    { id: "pivot", label: "Pivot", count: p.result.pivot_roles.length },
    ...(p.result.target_role_gap
      ? [{ id: "target" as Tab, label: "Target Gap" }]
      : []),
    { id: "assess", label: "CV Review" },
  ];

  return (
    <div className="space-y-6 pt-6">
      {/* Compass banner — persistent context: profile + counts + actions */}
      <div className="overflow-hidden rounded-3xl border border-indigo-400/20 bg-white/[0.03] shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">Your career map</div>
            <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
              {p.result.profile.seniority} · {p.result.profile.primary_industry}
              <span className="ml-2 text-sm font-medium text-white/50">· {p.result.profile.years_experience} yrs</span>
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {p.result.profile.top_skills.slice(0, 6).map((s) => (
                <span key={s} className="rounded-full bg-[#0C0D10] px-2.5 py-0.5 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-200">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <CountPill color="bg-emerald-400" label="Apply" count={p.result.apply_today.length} />
            <CountPill color="bg-amber-400" label="Stretch" count={p.result.stretch_roles.length} />
            <CountPill color="bg-purple-400" label="Pivot" count={p.result.pivot_roles.length} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#0C0D10] px-5 py-3 text-sm sm:px-6">
          <div className="flex items-center gap-2 text-white/65">
            <BarChart3 className="h-4 w-4" />
            <span className="line-clamp-1"><strong className="text-white/90">Demand:</strong> {p.result.industry_demand}</span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={p.startOver} className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/[0.03]">
              ← New search
            </button>
            <button onClick={p.onShare} className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-800">
              <Link2 className="mr-1 inline h-3 w-3" /> Share
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main results panel */}
        <section className="lg:col-span-8">
          <div className="overflow-visible rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-sm">
            {/* Mobile: dropdown. Desktop: sticky tab strip. */}
            <div className="sticky top-16 z-10 rounded-t-2xl border-b border-white/[0.08] bg-[#0C0D10] backdrop-blur p-3 sm:hidden">
              <label htmlFor="mobile-tab" className="sr-only">View section</label>
              <select
                id="mobile-tab"
                value={p.activeTab}
                onChange={(e) => p.setActiveTab(e.target.value as Tab)}
                className="w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-white/90 focus:border-indigo-700 focus:outline-none"
              >
                {tabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                    {typeof t.count === "number" ? ` (${t.count})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="sticky top-16 z-10 hidden overflow-x-auto rounded-t-2xl border-b border-white/[0.08] bg-[#0C0D10] backdrop-blur sm:flex">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => p.setActiveTab(t.id)}
                  className={`flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-semibold transition ${
                    p.activeTab === t.id
                      ? "border-b-2 border-indigo-700 text-indigo-300"
                      : "border-b-2 border-transparent text-white/65 hover:text-white"
                  }`}
                >
                  <TabIcon id={t.id} />
                  <span>{t.label}</span>
                  {typeof t.count === "number" && (
                    <span
                      className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
                        p.activeTab === t.id
                          ? "bg-indigo-400/20 text-indigo-200"
                          : "bg-white/[0.05] text-white/65"
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6">
            {p.activeTab === "apply" && (
              <TabHeader
                title="Apply Today"
                icon={<span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />}
                subtitle="Strong fit right now. Hit apply this week — these match your profile cleanly."
              >
                <div className="space-y-3">
                  {p.result.apply_today.map((r, i) => (
                    <RoleCard key={i} accent="hover:border-green-400">
                      <div className="font-semibold text-white">{r.title}</div>
                      <div className="mt-1 text-sm text-white/80">{r.why_you_fit}</div>
                      <LiveJobsPanel role={r.title} location={p.location} />
                    </RoleCard>
                  ))}
                </div>
              </TabHeader>
            )}

            {p.activeTab === "stretch" && (
              <TabHeader
                title="Stretch Roles"
                icon={<span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />}
                subtitle="One step up. Close the named gaps and you qualify."
              >
                <div className="space-y-3">
                  {p.result.stretch_roles.map((r, i) => (
                    <RoleCard key={i} accent="hover:border-amber-400">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-white">{r.title}</div>
                        <span className="shrink-0 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-bold text-amber-200">
                          {r.estimated_time_to_ready}
                        </span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {r.gaps.map((g, j) => (
                          <div key={j} className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3">
                            <div className="font-semibold text-white"><Target className="mr-1 inline h-3.5 w-3.5" />{g.skill}</div>
                            <div className="mt-0.5 text-sm text-white/80">{g.why_it_matters}</div>
                            {g.resources?.length > 0 && (
                              <LearnResources resources={g.resources} />
                            )}
                            <TrackSkillButton
                              skill={g.skill}
                              why_it_matters={g.why_it_matters}
                              target_role={r.title}
                              source="stretch"
                              resources={g.resources}
                            />
                          </div>
                        ))}
                      </div>
                      <LiveJobsPanel role={r.title} location={p.location} />
                    </RoleCard>
                  ))}
                </div>
              </TabHeader>
            )}

            {p.activeTab === "pivot" && (
              <TabHeader
                title="Pivot Roles"
                icon={<span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-400" />}
                subtitle="Adjacent paths you may not have considered."
              >
                <div className="space-y-3">
                  {p.result.pivot_roles.map((r, i) => (
                    <RoleCard key={i} accent="hover:border-purple-400">
                      <div className="font-semibold text-white">{r.title}</div>
                      <div className="mt-1 text-sm text-white/80">{r.why_it_works}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.transferable_skills.map((s, j) => (
                          <span
                            key={j}
                            className="rounded bg-purple-400/10 px-2 py-0.5 text-xs font-medium text-purple-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <LiveJobsPanel role={r.title} location={p.location} />
                    </RoleCard>
                  ))}
                </div>
              </TabHeader>
            )}

            {p.activeTab === "target" && p.result.target_role_gap && (
              <TargetRoleGapPanel gap={p.result.target_role_gap} location={p.location} />
            )}

            {p.activeTab === "assess" && (
              <AssessmentTab
                tone={p.tone}
                setTone={p.setTone}
                assessCV={p.assessCV}
                assessLoading={p.assessLoading}
                assessError={p.assessError}
                assessResult={p.assessResult}
              />
            )}
          </div>
        </div>
      </section>

      {/* Sidebar — legend + tips. Sticky on desktop. */}
      <aside className="lg:col-span-4">
        <div className="lg:sticky lg:top-32 space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 shadow-sm">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">What these mean</div>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2.5">
                <span className="mt-0.5 inline-block h-3 w-3 rounded-full bg-emerald-400" />
                <span><strong className="text-white">Apply Today</strong><span className="block text-white/65">Strong fit right now — apply this week.</span></span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 inline-block h-3 w-3 rounded-full bg-amber-400" />
                <span><strong className="text-white">Stretch</strong><span className="block text-white/65">One step up. Close the gaps and you qualify.</span></span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 inline-block h-3 w-3 rounded-full bg-purple-400" />
                <span><strong className="text-white">Pivot</strong><span className="block text-white/65">Adjacent paths you may not have considered.</span></span>
              </li>
              <li className="flex gap-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong className="text-white">CV Review</strong><span className="block text-white/65">Honest critique with three tones.</span></span>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
            <div className="mb-1 font-bold"><Lightbulb className="mr-1 inline h-4 w-4" />Tip</div>
            <p>Pin a stretch skill with <strong><BookmarkPlus className="mr-0.5 inline h-3 w-3" />Track this skill</strong> — it shows up in your <a href="/journey" className="underline hover:no-underline">Career Journey</a> with weekly nudges.</p>
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
}

function TabIcon({ id }: { id: Tab }) {
  switch (id) {
    case "apply": return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />;
    case "stretch": return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />;
    case "pivot": return <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-400" />;
    case "target": return <Target className="h-3.5 w-3.5" />;
    case "assess": return <FileText className="h-3.5 w-3.5" />;
  }
}

function CountPill({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/[0.03] px-3 py-1.5 ring-1 ring-white/[0.08] shadow-sm">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-xs font-semibold text-white/65">{label}</span>
      <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-xs font-bold text-white tabular-nums">{count}</span>
    </div>
  );
}

function TabHeader({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-xl font-bold text-white">{icon}{title}</h2>
      <p className="mt-1 mb-4 text-sm text-white/65">{subtitle}</p>
      {children}
    </div>
  );
}

function RoleCard({
  accent,
  children,
}: {
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`group overflow-hidden break-words rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accent}`}>
      {children}
    </div>
  );
}

function resourceUrl(r: LearningResource): string {
  const q = encodeURIComponent(r.search_query);
  if (r.type === "youtube") return `https://www.youtube.com/results?search_query=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

function resourceIcon(t: LearningResource["type"]): string {
  switch (t) {
    case "youtube": return "▶️";
    case "course": return "Grad";
    case "docs": return "Docs";
    case "article": return "News";
    case "practice": return "Tools";
  }
}

function LearnResources({ resources }: { resources: LearningResource[] }) {
  return (
    <div className="mt-2.5 border-t border-white/[0.08] pt-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-300">
        <BookmarkPlus className="h-3.5 w-3.5" />
        <span>Learn this — free, India-friendly</span>
      </div>
      <div className="space-y-1.5">
        {resources.map((r, i) => (
          <a
            key={i}
            href={resourceUrl(r)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] p-2 text-left transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-400/20"
          >
            <span className="text-base leading-none">{resourceIcon(r.type)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white group-hover:text-indigo-200">
                {r.title}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/65">
                <span className="font-medium text-white/80">{r.provider}</span>
                <span className="text-white/20">·</span>
                <span>{r.time_estimate}</span>
              </span>
            </span>
            <span aria-hidden className="self-center text-white/35 transition group-hover:translate-x-0.5 group-hover:text-indigo-600">↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function TrackSkillButton(props: {
  skill: string;
  why_it_matters?: string | null;
  target_role?: string | null;
  source: "stretch" | "target_gap";
  resources?: LearningResource[];
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "auth" | "error">("idle");

  async function track() {
    setState("saving");
    try {
      const res = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill: props.skill,
          why_it_matters: props.why_it_matters ?? null,
          target_role: props.target_role ?? null,
          source: props.source,
          resources: props.resources ?? [],
        }),
      });
      if (res.status === 401) { setState("auth"); return; }
      if (!res.ok) { setState("error"); return; }
      setState("saved");
    } catch {
      setState("error");
    }
  }

  if (state === "saved") {
    return (
      <a
        href="/journey"
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-400/15"
      >
        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Tracking — open your journey →
      </a>
    );
  }
  if (state === "auth") {
    return (
      <div className="mt-2.5 rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs text-amber-200">
        <Lock className="mr-1 inline h-3 w-3" /> Sign in (top right) to track skills across devices.
      </div>
    );
  }
  return (
    <button
      onClick={track}
      disabled={state === "saving"}
      className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-indigo-400/30 bg-white/[0.03] px-2.5 py-1.5 text-xs font-bold text-indigo-200 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-400/10 disabled:opacity-60"
    >
      {state === "saving" ? "Saving…" : state === "error" ? <><XCircle className="mr-0.5 inline h-3 w-3" /> Retry</> : <><BookmarkPlus className="mr-0.5 inline h-3 w-3" /> Track this skill</>}
    </button>
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
    critical: "bg-red-400/10 text-red-300 border-red-400/30",
    important: "bg-amber-400/10 text-amber-200 border-amber-400/30",
    nice_to_have: "bg-blue-400/10 text-blue-200 border-blue-400/30",
  };

  return (
    <div>
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-xl font-bold text-white">
            <Target className="mr-1 inline h-5 w-5" /> Readiness for: {gap.target}
          </h2>
          <p className="mt-1 text-sm text-white/65">
            How ready you are right now, and exactly what to close.
          </p>
        </div>
        <ScoreBadge score={gap.overall_readiness} label="Readiness" />
      </div>
      <div className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-white/90">
        {gap.summary}
      </div>
      <LiveJobsPanel role={gap.target} location={location} />

      <h3 className="mt-5 mb-2 text-sm font-bold uppercase text-white/50">
        Gaps to close
      </h3>
      <div className="space-y-2">
        {gap.gaps.map((g, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 ${severityColor[g.severity] ?? "border-white/[0.1] bg-white/[0.03]"}`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">{g.skill}</div>
              <span className="text-xs font-bold uppercase">
                {g.severity.replace("_", " ")}
              </span>
            </div>
            <div className="mt-1 text-sm">{g.how_to_close}</div>
            {g.resources?.length > 0 && <LearnResources resources={g.resources} />}
            <TrackSkillButton
              skill={g.skill}
              why_it_matters={g.how_to_close}
              target_role={gap.target}
              source="target_gap"
              resources={g.resources}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- ASSESSMENT TAB ---------- */

interface AssessProps {
  tone: Tone;
  setTone: (t: Tone) => void;
  assessCV: () => void;
  assessLoading: boolean;
  assessError: string | null;
  assessResult: RoastResult | null;
}

function AssessmentTab(p: AssessProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white"><FileText className="mr-1 inline h-5 w-5" /> CV Review</h2>
      <p className="mt-1 mb-5 text-sm text-white/65">
        Optional bonus — get a section-by-section critique with a Resume Health Score.
      </p>

      {!p.assessResult && (
        <>
          <label className="mb-2 block text-sm font-semibold text-white/90">
            Pick a tone
          </label>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => p.setTone(t.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  p.tone === t.id
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-white/[0.08] bg-white/[0.03] text-white/80 hover:border-white/20"
                }`}
              >
                <div className="font-semibold">
                  {t.label}
                </div>
                <div
                  className={`text-xs ${
                    p.tone === t.id ? "text-white/20" : "text-white/50"
                  }`}
                >
                  {t.sub}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={p.assessCV}
            disabled={p.assessLoading}
            className="w-full rounded-lg bg-neutral-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {p.assessLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Reviewing your CV…
              </span>
            ) : (
              <>
                    <FileText className="mr-1 inline h-4 w-4" /> Assess my CV
              </>
            )}
          </button>
        </>
      )}

      {p.assessError && (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
          {p.assessError}
        </div>
      )}

      {p.assessResult && <AssessResults result={p.assessResult} />}
    </div>
  );
}

function AssessResults({ result }: { result: RoastResult }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">The Verdict</h3>
          <ScoreBadge score={result.overall_score} label="Health Score" />
        </div>
        <p className="whitespace-pre-line text-white/80">
          {result.overall_roast}
        </p>
        <p className="mt-3 text-xs text-white/50">
          ⓘ AI-estimated Resume Health Score, not a real ATS score.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h3 className="mb-3 text-lg font-bold">Top 3 Fixes</h3>
        <ol className="space-y-3">
          {result.top_3_fixes.map((fix, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 text-white/90">{fix}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h3 className="mb-3 text-lg font-bold">Section by Section</h3>
        <div className="space-y-3">
          {result.sections.map((s) => (
            <div
              key={s.name}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold text-white">{s.name}</h4>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    s.score >= 7
                      ? "bg-green-400/10 text-green-300"
                      : s.score >= 4
                        ? "bg-amber-400/10 text-amber-200"
                        : "bg-red-400/10 text-red-300"
                  }`}
                >
                  {s.score}/10
                </span>
              </div>
              <p className="mb-2 text-sm italic text-white/80">{s.verdict}</p>
              {s.issues.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-sm text-white/80">
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
    score >= 75 ? "bg-green-600" : score >= 50 ? "bg-amber-400/100" : "bg-red-600";
  return (
    <div className="text-right">
      <div
        className={`inline-flex items-baseline gap-1 rounded-full px-3 py-1 text-white ${color}`}
      >
        <span className="text-2xl font-bold">{score}</span>
        <span className="text-sm opacity-80">/100</span>
      </div>
      <div className="mt-1 text-xs text-white/50">{label}</div>
    </div>
  );
}

/* ---------- FOOTER ---------- */

// ===== Daily Career Pulse =====
interface PulseData {
  headline: string;
  body: string;
  type: string;
  emoji: string;
  source_hint: string;
}

const PULSE_TYPE_GRADIENT: Record<string, string> = {
  trend: "bg-white/[0.03] border-indigo-400/20",
  salary: "bg-white/[0.03] border-emerald-400/20",
  tip: "bg-white/[0.03] border-amber-400/20",
  opening: "bg-white/[0.03] border-blue-400/20",
  tool: "bg-white/[0.03] border-fuchsia-400/20",
};

function readLastProfile(): { seniority?: string; industry?: string; location?: string; top_skills?: string[] } | null {
  try {
    const raw = typeof window === "undefined" ? null : localStorage.getItem("cc:profile:v1");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function DailyPulseCard() {
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const profile = readLastProfile();
      const res = await fetch("/api/pulse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load pulse");
      setData(json.insight as PulseData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pulse");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grad = data ? PULSE_TYPE_GRADIENT[data.type] ?? PULSE_TYPE_GRADIENT.trend : PULSE_TYPE_GRADIENT.trend;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  return (
    <section
      aria-label="Daily Career Pulse"
      className={`fade-up fade-up-delay-3 mt-6 rounded-2xl border bg-gradient-to-br p-5 shadow-lg shadow-indigo-100/40 backdrop-blur ${grad}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600" />
          Daily Career Pulse · {today}
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Refresh pulse"
          className="rounded-md border border-white/[0.1] bg-[#0C0D10] px-2 py-0.5 text-xs font-medium text-white/80 transition hover:border-white/25 disabled:opacity-50"
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      {loading && !data && (
        <div className="space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-4 w-full animate-pulse rounded bg-white/[0.08]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.08]" />
        </div>
      )}

      {error && !loading && (
        <div className="text-sm text-white/65">
          Couldn&apos;t load today&apos;s pulse.{" "}
          <button onClick={load} className="font-semibold text-indigo-300 underline">
            Try again
          </button>
        </div>
      )}

      {data && !loading && (
        <div>
          <h3 className="flex items-start gap-2 text-base font-bold leading-snug text-white sm:text-lg">
            <span className="text-xl">{data.emoji}</span>
            <span>{data.headline}</span>
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-white/80">{data.body}</p>
          {data.source_hint && (
            <p className="mt-2 text-xs italic text-white/50"><Lightbulb className="mr-1 inline h-3 w-3" />{data.source_hint}</p>
          )}
        </div>
      )}
    </section>
  );
}

const SOFT_LOGIN_DISMISS_KEY = "cc:softlogin:dismissed:v1";

function SoftLoginToast() {
  const [show, setShow] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabase();
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        if (data.user) return;
        const dismissedAt = Number(localStorage.getItem(SOFT_LOGIN_DISMISS_KEY) ?? 0);
        // Re-show after 7 days even if dismissed
        if (dismissedAt && Date.now() - dismissedAt < 7 * 24 * 3600 * 1000) return;
        setTimeout(() => {
          if (!cancelled) setShow(true);
        }, 4000);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(SOFT_LOGIN_DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <>
      <div
        role="dialog"
        aria-label="Save your map"
        className="pointer-events-auto fixed inset-x-3 bottom-4 z-40 mx-auto max-w-md rounded-2xl border-2 border-indigo-400/30 bg-[#0C0D10] p-4 shadow-2xl shadow-indigo-300/40 backdrop-blur sm:right-6 sm:left-auto sm:bottom-6"
        style={{ animation: "fadeUp 0.4s ease-out both" }}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl"><BookmarkPlus className="h-6 w-6" /></div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-white">Save this map?</div>
            <p className="mt-0.5 text-xs leading-snug text-white/80">
              Sign in to keep your career map, track skill progress, and get a
              personalised weekly digest. Saves your work across devices.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-800"
              >
                Sign in (1 click)
              </button>
              <button
                onClick={dismiss}
                className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/25"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 rounded-md p-1 text-white/35 hover:bg-white/[0.05] hover:text-white/80"
          >
            ✕
          </button>
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

