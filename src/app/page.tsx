"use client";

import { useEffect, useState } from "react";
import type {
  MatchResult,
  RoastResult,
  Tone,
  LearningResource,
} from "@/lib/prompts";
import { buildJobLinks } from "@/lib/jobLinks";
import ShareModal from "@/components/ShareModal";
import UserMenu from "@/components/UserMenu";
import CvInput from "@/components/CvInput";
import AuthModal from "@/components/AuthModal";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const SITE_URL = "https://career-compass-orpin-tau.vercel.app";
const DRAFT_KEY = "cc:draft:v1";

const PROGRESS_STEPS = [
  "Reading your CV…",
  "Spotting roles you can apply for today…",
  "Mapping stretch & pivot paths…",
  "Checking India market demand…",
  "Almost there — formatting your map…",
];

const TONES: Array<{ id: Tone; emoji: string; label: string; sub: string }> = [
  { id: "honest", emoji: "🎯", label: "Direct", sub: "Professional & clear" },
  { id: "encouraging", emoji: "💚", label: "Supportive", sub: "Constructive" },
  { id: "roast", emoji: "🔥", label: "Punchy", sub: "Funny & sharp" },
];

const TRUST_PILLS = [
  { icon: "⚡", label: "30-second results" },
  { icon: "🔒", label: "CV never stored" },
  { icon: "🆓", label: "Free · Login optional" },
  { icon: "🇮🇳", label: "India-aware" },
];

const EXAMPLE_ROLES = [
  { icon: "🟢", title: "Senior Backend Engineer · Fintech" },
  { icon: "🟡", title: "Engineering Manager · SaaS" },
  { icon: "🟣", title: "Product Manager · D2C" },
  { icon: "🟢", title: "Data Engineer · Analytics" },
  { icon: "🟡", title: "Solutions Architect · Cloud" },
  { icon: "🟣", title: "DevRel · Developer Tools" },
  { icon: "🟢", title: "Senior SDET · Platform" },
  { icon: "🟡", title: "Tech Lead · Payments" },
  { icon: "🟣", title: "AI Product Manager · GenAI" },
  { icon: "🟢", title: "Site Reliability Engineer" },
  { icon: "🟡", title: "Director of Engineering" },
  { icon: "🟣", title: "Growth PM · B2B SaaS" },
];

type Tab = "apply" | "stretch" | "pivot" | "target" | "assess";

export default function HomePage() {
  const [resume, setResume] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [location, setLocation] = useState("");
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
  }, []);

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
          resume,
          target_role: targetRole.trim() || null,
          location: location.trim() || null,
        }),
      });
      const data = (await res.json()) as { result?: MatchResult; error?: string };
      if (!res.ok || !data.result) {
        setMatchError(data.error ?? "Something went wrong.");
      } else {
        setMatchResult(data.result);
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
    <main className="relative min-h-screen overflow-x-hidden bg-neutral-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-gradient-to-b from-indigo-50 via-purple-50/70 to-transparent" />
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />

      <TopNav onShare={() => setShareOpen(true)} hasResults={hasResults} onReset={startOver} />

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {!hasResults ? (
          <LandingView
            resume={resume}
            setResume={setResume}
            targetRole={targetRole}
            setTargetRole={setTargetRole}
            location={location}
            setLocation={setLocation}
            charCount={charCount}
            tooShort={tooShort}
            matchLoading={matchLoading}
            matchError={matchError}
            mapCareer={mapCareer}
            progressIdx={progressIdx}
          />
        ) : (
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
        )}
      </div>

      <Footer onShare={() => setShareOpen(true)} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} url={buildShareUrl(matchResult)} />
      {hasResults && <SoftLoginToast />}
    </main>
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

/* ---------- TOP NAV ---------- */

function TopNav({
  onShare,
  hasResults,
  onReset,
}: {
  onShare: () => void;
  hasResults: boolean;
  onReset: () => void;
}) {
  const [stats, setStats] = useState<{ searches_7d: number } | null>(null);
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  return (
    <nav className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={hasResults ? onReset : undefined}
            className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-neutral-900 transition hover:opacity-80 sm:gap-2 sm:text-base"
          >
            <span className="text-xl sm:text-2xl">🧭</span>
            <span>CareerCompass</span>
          </button>
          {stats && stats.searches_7d > 0 && (
            <span className="inline-flex shrink items-center gap-1 truncate rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-800 sm:px-2.5 sm:text-xs">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-green-600" />
              🔥 {stats.searches_7d.toLocaleString()}
              <span className="hidden sm:inline"> maps this week</span>
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {hasResults && (
            <button
              onClick={onReset}
              aria-label="New search"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 sm:px-3"
            >
              <span>←</span>
              <span className="hidden sm:inline">New search</span>
            </button>
          )}
          <a
            href="/journey"
            aria-label="My Journey"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-100 sm:px-3"
          >
            <span>🧗</span>
            <span className="hidden sm:inline">My Journey</span>
          </a>
          <button
            onClick={onShare}
            aria-label="Share"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 sm:px-3"
          >
            <span>🔗</span>
            <span className="hidden sm:inline">Share</span>
          </button>
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}

/* ---------- LANDING VIEW ---------- */

interface LandingProps {
  resume: string;
  setResume: (v: string) => void;
  targetRole: string;
  setTargetRole: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  charCount: number;
  tooShort: boolean;
  matchLoading: boolean;
  matchError: string | null;
  mapCareer: () => void;
  progressIdx: number;
}

function LandingView(p: LandingProps) {
  return (
    <>
      <header className="pt-10 pb-8 text-center sm:pt-16">
        <div className="fade-up mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-800 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600" />
          Powered by Google Gemini · Free for everyone
        </div>
        <h1 className="hero-shimmer fade-up fade-up-delay-1 bg-gradient-to-br from-neutral-900 via-indigo-900 to-purple-900 bg-clip-text pb-2 text-4xl font-extrabold leading-[1.15] tracking-tight text-transparent sm:text-6xl">
          Find the roles you<br />
          <span className="text-indigo-700">should actually</span> apply for.
        </h1>
        <p className="fade-up fade-up-delay-2 mx-auto mt-5 max-w-2xl text-base text-neutral-600 sm:text-lg">
          Paste your CV. Get a personalised career map: roles you fit today,
          stretch roles 1–2 steps away, and adjacent paths you haven&apos;t
          considered.
        </p>
        <div className="fade-up fade-up-delay-3 mt-6 flex flex-wrap items-center justify-center gap-2">
          {TRUST_PILLS.map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-neutral-700 backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100"
            >
              <span>{pill.icon}</span>
              <span>{pill.label}</span>
            </span>
          ))}
        </div>

        {/* Eye-candy: marquee of example AI outputs so users SEE what they'll get */}
        <div className="marquee-pause fade-up fade-up-delay-3 mt-8 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="marquee gap-2">
            {[...EXAMPLE_ROLES, ...EXAMPLE_ROLES].map((r, i) => (
              <span
                key={i}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur"
              >
                <span>{r.icon}</span>
                <span>{r.title}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Cross-link to Ghost Buster — the new viral feature */}
        <div className="fade-up fade-up-delay-3 mt-6 flex justify-center">
          <a
            href="/ghost-buster"
            className="group inline-flex items-center gap-2 rounded-full border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-2 text-sm font-semibold text-purple-900 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-200/60"
          >
            <span className="text-base">👻</span>
            <span>New: <span className="underline decoration-purple-400 underline-offset-2">Ghost Buster</span> — find out why you&apos;re being ghosted</span>
            <span className="transition group-hover:translate-x-0.5">→</span>
          </a>
        </div>

        <div className="mx-auto mt-2 max-w-3xl text-left">
          <DailyPulseCard />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-xl shadow-indigo-100/50 backdrop-blur sm:p-7 lg:col-span-3">
          <CvInput value={p.resume} onChange={p.setResume} />

          <label
            htmlFor="targetRole"
            className="mt-5 mb-2 block text-sm font-semibold text-neutral-800"
          >
            Step 2 — Target role{" "}
            <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <input
            id="targetRole"
            type="text"
            value={p.targetRole}
            onChange={(e) => p.setTargetRole(e.target.value)}
            placeholder="e.g. Senior Product Manager, Director of Engineering"
            maxLength={100}
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-700 focus:bg-white focus:outline-none"
          />

          <label
            htmlFor="location"
            className="mt-4 mb-2 block text-sm font-semibold text-neutral-800"
          >
            Step 3 — Preferred location{" "}
            <span className="font-normal text-neutral-500">(optional, for live links)</span>
          </label>
          <input
            id="location"
            type="text"
            value={p.location}
            onChange={(e) => p.setLocation(e.target.value)}
            placeholder="e.g. Bengaluru, Mumbai, Remote, London"
            maxLength={60}
            className="w-full rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-700 focus:bg-white focus:outline-none"
          />

          <button
            onClick={p.mapCareer}
            disabled={p.matchLoading || p.charCount < 200}
            className="cta-sheen mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-purple-700 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-300/50 transition hover:from-indigo-800 hover:to-purple-800 hover:shadow-xl hover:shadow-indigo-400/60 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:from-neutral-300 disabled:to-neutral-300 disabled:shadow-none"
          >
            {p.matchLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {PROGRESS_STEPS[p.progressIdx]}
              </span>
            ) : (
              <span>🧭 Map my career →</span>
            )}
          </button>

          {p.matchError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <div className="font-semibold">Couldn&apos;t map your career.</div>
              <div className="mt-1">{p.matchError}</div>
              <button
                onClick={p.mapCareer}
                className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Try again
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:col-span-2">
          <FeatureCard
            icon="🟢"
            title="Apply Today"
            text="Roles where your CV is already a strong fit. Hit apply this week."
            color="border-green-200 bg-green-50"
          />
          <FeatureCard
            icon="🟡"
            title="Stretch Roles"
            text="One or two steps up. We name the exact gaps holding you back."
            color="border-amber-200 bg-amber-50"
          />
          <FeatureCard
            icon="🟣"
            title="Pivot Roles"
            text="Adjacent paths you might not have considered, with the transferable skills mapped."
            color="border-purple-200 bg-purple-50"
          />
          <FeatureCard
            icon="🎯"
            title="Target Role Gap"
            text="Tell us a dream role and get a readiness score plus a closing plan."
            color="border-indigo-200 bg-indigo-50"
          />
        </aside>
      </div>

      <div className="mt-10 rounded-2xl border border-neutral-200 bg-white/80 p-5 text-center shadow-sm backdrop-blur">
        <p className="text-sm text-neutral-700">
          ⓘ Your CV is sent to Google Gemini for analysis and is{" "}
          <strong>never stored</strong> on our servers. Sign-in is optional —
          it just saves your search history.
        </p>
      </div>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  text,
  color,
}: {
  icon: string;
  title: string;
  text: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-100/60 ${color}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="font-bold text-neutral-900">{title}</span>
      </div>
      <p className="text-sm text-neutral-700">{text}</p>
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
  const tabs: Array<{ id: Tab; label: string; count?: number; emoji: string }> = [
    { id: "apply", emoji: "🟢", label: "Apply Today", count: p.result.apply_today.length },
    { id: "stretch", emoji: "🟡", label: "Stretch", count: p.result.stretch_roles.length },
    { id: "pivot", emoji: "🟣", label: "Pivot", count: p.result.pivot_roles.length },
    ...(p.result.target_role_gap
      ? [{ id: "target" as Tab, emoji: "🎯", label: "Target Gap" }]
      : []),
    { id: "assess", emoji: "📝", label: "CV Review" },
  ];

  return (
    <div className="grid gap-6 pt-6 lg:grid-cols-12">
      {/* Sidebar — collapsible on mobile, sticky on desktop */}
      <aside className="lg:col-span-4">
        <details className="group lg:hidden mb-4 rounded-2xl border-2 border-indigo-700 bg-gradient-to-br from-indigo-50 to-white shadow-md">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <span className="flex min-w-0 items-center gap-2 font-bold text-neutral-900">
              <span className="shrink-0 text-xl">👤</span>
              <span className="truncate">{p.result.profile.seniority} · {p.result.profile.primary_industry}</span>
            </span>
            <span className="shrink-0 text-xs text-indigo-700 group-open:hidden">Details ▾</span>
            <span className="shrink-0 text-xs text-indigo-700 hidden group-open:inline">Hide ▴</span>
          </summary>
          <div className="border-t border-indigo-200 p-4 space-y-3">
            <SidebarStat label="Experience" value={`${p.result.profile.years_experience} years`} />
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase text-neutral-500">Top skills</div>
              <div className="flex flex-wrap gap-1">
                {p.result.profile.top_skills.map((s) => (
                  <span key={s} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">{s}</span>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
              <strong>📊 Demand:</strong> {p.result.industry_demand}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={p.startOver} className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700">← New</button>
              <button onClick={p.onShare} className="flex-1 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">🔗 Share</button>
            </div>
          </div>
        </details>

        <div className="hidden lg:block sticky top-20 space-y-4">
          <div className="rounded-2xl border-2 border-indigo-700 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-lg shadow-indigo-200/40">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl">👤</span>
              <h2 className="text-lg font-bold text-neutral-900">Your profile</h2>
            </div>
            <div className="space-y-3">
              <SidebarStat label="Seniority" value={p.result.profile.seniority} />
              <SidebarStat
                label="Experience"
                value={`${p.result.profile.years_experience} years`}
              />
              <SidebarStat label="Industry" value={p.result.profile.primary_industry} />
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase text-neutral-500">
                  Top skills
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.result.profile.top_skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-blue-900">
              📊 Industry demand
            </h3>
            <p className="text-sm text-blue-900">{p.result.industry_demand}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={p.startOver}
              className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              ← New search
            </button>
            <button
              onClick={p.onShare}
              className="flex-1 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
            >
              🔗 Share
            </button>
          </div>
        </div>
      </aside>

      {/* Main results panel */}
      <section className="lg:col-span-8">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {/* Mobile: dropdown. Desktop: tab strip. */}
          <div className="border-b border-neutral-200 p-3 sm:hidden">
            <label htmlFor="mobile-tab" className="sr-only">View section</label>
            <select
              id="mobile-tab"
              value={p.activeTab}
              onChange={(e) => p.setActiveTab(e.target.value as Tab)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-800 focus:border-indigo-700 focus:outline-none"
            >
              {tabs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.label}
                  {typeof t.count === "number" ? ` (${t.count})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden overflow-x-auto border-b border-neutral-200 sm:flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => p.setActiveTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-semibold transition ${
                  p.activeTab === t.id
                    ? "border-b-2 border-indigo-700 text-indigo-700"
                    : "border-b-2 border-transparent text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
                {typeof t.count === "number" && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
                      p.activeTab === t.id
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-neutral-100 text-neutral-600"
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
                title="🟢 Apply Today"
                subtitle="Strong fit right now. Hit apply this week — these match your profile cleanly."
              >
                <div className="space-y-3">
                  {p.result.apply_today.map((r, i) => (
                    <RoleCard key={i} accent="hover:border-green-400">
                      <div className="font-semibold text-neutral-900">{r.title}</div>
                      <div className="mt-1 text-sm text-neutral-700">{r.why_you_fit}</div>
                      <JobLinksRow role={r.title} location={p.location} />
                    </RoleCard>
                  ))}
                </div>
              </TabHeader>
            )}

            {p.activeTab === "stretch" && (
              <TabHeader
                title="🟡 Stretch Roles"
                subtitle="One step up. Close the named gaps and you qualify."
              >
                <div className="space-y-3">
                  {p.result.stretch_roles.map((r, i) => (
                    <RoleCard key={i} accent="hover:border-amber-400">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-neutral-900">{r.title}</div>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                          {r.estimated_time_to_ready}
                        </span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {r.gaps.map((g, j) => (
                          <div key={j} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                            <div className="font-semibold text-neutral-900">🎯 {g.skill}</div>
                            <div className="mt-0.5 text-sm text-neutral-700">{g.why_it_matters}</div>
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
                      <JobLinksRow role={r.title} location={p.location} />
                    </RoleCard>
                  ))}
                </div>
              </TabHeader>
            )}

            {p.activeTab === "pivot" && (
              <TabHeader
                title="🟣 Pivot Roles"
                subtitle="Adjacent paths you may not have considered."
              >
                <div className="space-y-3">
                  {p.result.pivot_roles.map((r, i) => (
                    <RoleCard key={i} accent="hover:border-purple-400">
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
                      <JobLinksRow role={r.title} location={p.location} />
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
    </div>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-neutral-500">{label}</div>
      <div className="font-medium text-neutral-900">{value}</div>
    </div>
  );
}

function TabHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-neutral-600">{subtitle}</p>
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
    <div className={`group overflow-hidden break-words rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accent}`}>
      {children}
    </div>
  );
}

function JobLinksRow({ role, location }: { role: string; location: string }) {
  const links = buildJobLinks(role, location);
  if (links.length === 0) return null;
  return (
    <div className="mt-3 border-t border-neutral-100 pt-3">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        See live openings{location.trim() ? ` · ${location.trim()}` : ""}
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

function LearnResources({ resources }: { resources: LearningResource[] }) {
  return (
    <div className="mt-2.5 border-t border-neutral-200/70 pt-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700">
        <span>📚</span>
        <span>Learn this — free, India-friendly</span>
      </div>
      <div className="space-y-1.5">
        {resources.map((r, i) => (
          <a
            key={i}
            href={resourceUrl(r)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 rounded-md border border-neutral-200 bg-white p-2 text-left transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100"
          >
            <span className="text-base leading-none">{resourceIcon(r.type)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-neutral-900 group-hover:text-indigo-800">
                {r.title}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-600">
                <span className="font-medium text-neutral-700">{r.provider}</span>
                <span className="text-neutral-300">·</span>
                <span>⏱ {r.time_estimate}</span>
              </span>
            </span>
            <span aria-hidden className="self-center text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600">↗</span>
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
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
      >
        ✅ Tracking — open your journey →
      </a>
    );
  }
  if (state === "auth") {
    return (
      <div className="mt-2.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
        🔐 Sign in (top right) to track skills across devices.
      </div>
    );
  }
  return (
    <button
      onClick={track}
      disabled={state === "saving"}
      className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-bold text-indigo-800 transition hover:-translate-y-0.5 hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-60"
    >
      {state === "saving" ? "Saving…" : state === "error" ? "❌ Retry" : "📌 Track this skill"}
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
    critical: "bg-red-100 text-red-800 border-red-300",
    important: "bg-amber-100 text-amber-800 border-amber-300",
    nice_to_have: "bg-blue-100 text-blue-800 border-blue-300",
  };

  return (
    <div>
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-xl font-bold text-neutral-900">
            🎯 Readiness for: {gap.target}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            How ready you are right now, and exactly what to close.
          </p>
        </div>
        <ScoreBadge score={gap.overall_readiness} label="Readiness" />
      </div>
      <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
        {gap.summary}
      </div>
      <JobLinksRow role={gap.target} location={location} />

      <h3 className="mt-5 mb-2 text-sm font-bold uppercase text-neutral-500">
        Gaps to close
      </h3>
      <div className="space-y-2">
        {gap.gaps.map((g, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 ${severityColor[g.severity] ?? "border-neutral-300 bg-neutral-50"}`}
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
      <h2 className="text-xl font-bold text-neutral-900">📝 CV Review</h2>
      <p className="mt-1 mb-5 text-sm text-neutral-600">
        Optional bonus — get a section-by-section critique with a Resume Health Score.
      </p>

      {!p.assessResult && (
        <>
          <label className="mb-2 block text-sm font-semibold text-neutral-800">
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
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                }`}
              >
                <div className="font-semibold">
                  {t.emoji} {t.label}
                </div>
                <div
                  className={`text-xs ${
                    p.tone === t.id ? "text-neutral-300" : "text-neutral-500"
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
              "📝 Assess my CV"
            )}
          </button>
        </>
      )}

      {p.assessError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
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
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">The Verdict</h3>
          <ScoreBadge score={result.overall_score} label="Health Score" />
        </div>
        <p className="whitespace-pre-line text-neutral-700">
          {result.overall_roast}
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          ⓘ AI-estimated Resume Health Score, not a real ATS score.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
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

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-lg font-bold">Section by Section</h3>
        <div className="space-y-3">
          {result.sections.map((s) => (
            <div
              key={s.name}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
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
    score >= 75 ? "bg-green-600" : score >= 50 ? "bg-amber-500" : "bg-red-600";
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

/* ---------- FOOTER ---------- */

function Footer({ onShare }: { onShare: () => void }) {
  return (
    <footer className="border-t border-neutral-200 bg-white/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-neutral-500 sm:flex-row sm:px-6">
        <div>
          Built with Next.js · Google Gemini · Open source ·{" "}
          <a
            href="https://github.com/siddhu-tri2000/career-compass"
            className="underline hover:text-neutral-900"
          >
            GitHub
          </a>
        </div>
        <button
          onClick={onShare}
          className="text-indigo-700 underline hover:text-indigo-900"
        >
          🔗 Share with a friend
        </button>
      </div>
    </footer>
  );
}

// ===== Daily Career Pulse =====
interface PulseData {
  headline: string;
  body: string;
  type: string;
  emoji: string;
  source_hint: string;
}

const PULSE_TYPE_GRADIENT: Record<string, string> = {
  trend: "from-indigo-50 via-white to-purple-50 border-indigo-200",
  salary: "from-emerald-50 via-white to-teal-50 border-emerald-200",
  tip: "from-amber-50 via-white to-orange-50 border-amber-200",
  opening: "from-blue-50 via-white to-cyan-50 border-blue-200",
  tool: "from-fuchsia-50 via-white to-pink-50 border-fuchsia-200",
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
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600" />
          Daily Career Pulse · {today}
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Refresh pulse"
          className="rounded-md border border-neutral-300 bg-white/70 px-2 py-0.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-500 disabled:opacity-50"
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      {loading && !data && (
        <div className="space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-200/80" />
          <div className="h-4 w-full animate-pulse rounded bg-neutral-200/60" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-200/60" />
        </div>
      )}

      {error && !loading && (
        <div className="text-sm text-neutral-600">
          Couldn&apos;t load today&apos;s pulse.{" "}
          <button onClick={load} className="font-semibold text-indigo-700 underline">
            Try again
          </button>
        </div>
      )}

      {data && !loading && (
        <div>
          <h3 className="flex items-start gap-2 text-base font-bold leading-snug text-neutral-900 sm:text-lg">
            <span className="text-xl">{data.emoji}</span>
            <span>{data.headline}</span>
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">{data.body}</p>
          {data.source_hint && (
            <p className="mt-2 text-xs italic text-neutral-500">💡 {data.source_hint}</p>
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
        className="pointer-events-auto fixed inset-x-3 bottom-4 z-40 mx-auto max-w-md rounded-2xl border-2 border-indigo-300 bg-white/95 p-4 shadow-2xl shadow-indigo-300/40 backdrop-blur sm:right-6 sm:left-auto sm:bottom-6"
        style={{ animation: "fadeUp 0.4s ease-out both" }}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl">💾</div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-neutral-900">Save this map?</div>
            <p className="mt-0.5 text-xs leading-snug text-neutral-700">
              Sign in to keep your career map, track skill progress, and get a
              personalised weekly digest. Free forever.
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
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-500"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

