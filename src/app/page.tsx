import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowUpRight,
  Compass,
  Sparkles,
  FileText,
  Lightbulb,
  Target,
  Wrench,
  Ghost,
  Mountain,
} from "lucide-react";
import PageChrome from "@/components/PageChrome";
import ContentContainer from "@/components/ContentContainer";
import LiveStats from "@/components/LiveStats";

export const metadata: Metadata = {
  title: "CareerCompass — Your AI career toolkit",
  description:
    "Four AI tools to find the right roles, fix your CV, write cover letters, and figure out why you're being ghosted. Built on Google Gemini. 5 free runs/day.",
};

type Tool = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  cta: string;
  ribbon?: string;
  accent: string; // hex for the icon dot
};

const TOOLS: Tool[] = [
  {
    href: "/map",
    eyebrow: "Career Map",
    title: "Find roles you should actually apply for.",
    description:
      "Drop your CV. Get a personalised map: roles you fit today, stretch roles 1–2 steps away, and adjacent paths you hadn't considered — with live job listings beside every role.",
    bullets: ["Apply Today", "Stretch", "Pivot", "Live jobs", "Track skills"],
    Icon: Compass,
    cta: "Map my career",
    ribbon: "Most popular",
    accent: "#6E7BFF",
  },
  {
    href: "/studio",
    eyebrow: "Resume Studio",
    title: "Make your CV survive any ATS — and write the cover letter too.",
    description:
      "Recruiter-grade rewrite plus an honest ATS score in 30 seconds. Polish for any job, tailor to one specific JD, then auto-write a matching cover letter — no hallucinations.",
    bullets: ["ATS polish", "Tailor to JD", "Cover letters", "JD from URL", ".docx export"],
    Icon: Wrench,
    cta: "Open Resume Studio",
    ribbon: "Updated",
    accent: "#34D399",
  },
  {
    href: "/ghost-buster",
    eyebrow: "JD Ghost Buster",
    title: "Find out why you're being ghosted.",
    description:
      "Paste a JD URL or text and your CV. Get a brutally honest forensics report on what's going wrong — keyword gaps, weak proof, format issues, the works.",
    bullets: ["Honest diagnosis", "Red flags", "Fix list", "JD from URL"],
    Icon: Ghost,
    cta: "Bust the ghost",
    accent: "#FB7185",
  },
  {
    href: "/journey",
    eyebrow: "Career Journey",
    title: "Track wins. Plan the next step.",
    description:
      "Your saved career maps, ATS scores, bookmarked roles, and the skills you're actively learning — all in one place. Sign in optional, works offline-first too.",
    bullets: ["Saved maps", "Score history", "Bookmarked", "Skill tracker"],
    Icon: Mountain,
    cta: "View journey",
    accent: "#60A5FA",
  },
];

const STEPS = [
  { n: "01", title: "Pick a tool", body: "Career map, CV polish, ghost diagnosis — start wherever you're stuck.", Icon: Target },
  { n: "02", title: "Paste your CV", body: "PDF, DOCX, or plain text. Parsed in your browser, sent to Gemini, never stored.", Icon: FileText },
  { n: "03", title: "Get honest answers", body: "Specific roles, specific gaps, specific rewrites. No motivational fluff.", Icon: Lightbulb },
];

export default function LandingPage() {
  return (
    <PageChrome>
      <Hero />
      <ContentContainer width="wide" as="div" className="relative z-10">
        <FeatureGrid />
        <HowItWorks />
        <FinalCta />
      </ContentContainer>
    </PageChrome>
  );
}

/* ────────── HERO ────────── */
function Hero() {
  return (
    <header className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[720px]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(110,123,255,0.18) 0%, rgba(110,123,255,0.06) 35%, rgba(8,9,10,0) 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-20 text-center sm:pt-28">
        <div className="fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[12px] text-white/70 backdrop-blur">
          <span className="live-dot" />
          <span>Your AI career toolkit</span>
          <span className="text-white/25">·</span>
          <Sparkles className="h-3 w-3 text-[#A5B4FC]" />
          <span className="text-white/85">Powered by Gemini</span>
        </div>

        <h1 className="fade-up fade-up-delay-1 hero-display mx-auto max-w-4xl">
          Stop guessing.
          <br />
          Start moving.
        </h1>

        <p className="fade-up fade-up-delay-2 mx-auto mt-7 max-w-2xl text-[16px] leading-relaxed text-white/60 sm:text-[17px]">
          Four AI tools that tell you the truth about your career —
          which roles fit, what&apos;s breaking your CV, and why you&apos;re
          being ghosted. Plus live job listings, JD URL fetch, and AI cover
          letters baked in.
        </p>

        <div className="fade-up fade-up-delay-3 mt-7 flex flex-wrap items-center justify-center gap-2 text-[12px] text-white/65">
          <Pill>🔒 CV never stored</Pill>
          <Pill>5 free runs / day</Pill>
          <Pill>🇮🇳 India-aware</Pill>
          <LiveStats />
        </div>

        <div className="fade-up fade-up-delay-3 mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/map"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#08090A] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_4px_16px_rgba(0,0,0,0.4)] transition hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_8px_32px_rgba(110,123,255,0.25)]"
          >
            Map my career
            <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#tools"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-6 py-3 text-[14px] font-medium text-white/80 transition hover:border-white/25 hover:bg-white/[0.04] hover:text-white"
          >
            Browse all tools
          </a>
        </div>

        {/* product peek */}
        <div className="relative mt-20">
          <div
            aria-hidden
            className="absolute inset-x-0 -top-10 mx-auto h-40 max-w-3xl blur-3xl"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 50%, rgba(110,123,255,0.30) 0%, rgba(110,123,255,0) 70%)",
            }}
          />
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] text-left shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="ml-3 text-[11px] text-white/40">careercompass.app / map</span>
            </div>
            <div className="grid grid-cols-12 gap-0">
              <aside className="col-span-3 hidden border-r border-white/[0.06] p-4 text-[12px] text-white/55 sm:block">
                <div className="mb-3 text-[10px] uppercase tracking-widest text-white/35">Profile</div>
                <div className="mb-1 truncate text-white/85">Senior PM · 6 yrs</div>
                <div className="mb-5 truncate text-white/45">Bengaluru · Remote</div>
                <div className="mb-2 text-[10px] uppercase tracking-widest text-white/35">Legend</div>
                <LegendRow color="#34D399" label="Apply today" count={7} />
                <LegendRow color="#FBBF24" label="Stretch" count={5} />
                <LegendRow color="#A78BFA" label="Pivot" count={3} />
              </aside>
              <section className="col-span-12 p-5 sm:col-span-9">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px]">
                  <ChipActive>Apply today</ChipActive>
                  <Chip>Stretch</Chip>
                  <Chip>Pivot</Chip>
                  <Chip>CV gaps</Chip>
                </div>
                <RoleRow color="#34D399" title="Senior Product Manager — Fintech" company="Razorpay" match="92% match" />
                <RoleRow color="#34D399" title="Lead PM, Growth" company="Cred" match="88% match" />
                <RoleRow color="#FBBF24" title="Group Product Manager" company="Swiggy" match="76% · stretch" />
                <RoleRow color="#A78BFA" title="Founding PM, AI Tools" company="Stealth · Series A" match="64% · pivot" />
              </section>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[12px] text-white/75">
      {children}
    </span>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-white/[0.08] px-2.5 py-1 text-[11px] text-white/55">{children}</span>;
}
function ChipActive({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-[#08090A]">{children}</span>;
}
function LegendRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-white/40">{count}</span>
    </div>
  );
}
function RoleRow({ color, title, company, match }: { color: string; title: string; company: string; match: string }) {
  return (
    <div className="flex items-center justify-between border-t border-white/[0.05] py-3 text-[13px] first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        <div className="min-w-0">
          <div className="truncate text-white/90">{title}</div>
          <div className="truncate text-[11px] text-white/45">{company}</div>
        </div>
      </div>
      <div className="shrink-0 text-[11px] text-white/55">{match}</div>
    </div>
  );
}

/* ────────── TOOLS GRID ────────── */
function FeatureGrid() {
  return (
    <section id="tools" className="scroll-mt-20 pt-20">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <span className="eyebrow">Pick your tool</span>
          <h2 className="mt-3 text-[32px] font-semibold tracking-tight text-white sm:text-[40px]">
            Four ways to get unstuck.
          </h2>
        </div>
        <span className="hidden text-[13px] text-white/45 sm:inline">
          Each one works on its own. Mix &amp; match.
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.href} tool={tool} />
        ))}
      </div>
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const { Icon } = tool;
  return (
    <Link
      href={tool.href}
      className="bento group relative flex flex-col p-6 no-underline"
    >
      {tool.ribbon && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/75">
          {tool.ribbon}
        </span>
      )}

      <div className="mb-5 flex items-center gap-3">
        <span
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.03]"
          style={{ boxShadow: `0 0 20px -6px ${tool.accent}40` }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="eyebrow">{tool.eyebrow}</span>
      </div>

      <h3 className="text-[20px] font-semibold leading-snug tracking-tight text-white sm:text-[22px]">
        {tool.title}
      </h3>

      <p className="mt-2 text-[14px] leading-relaxed text-white/60">
        {tool.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {tool.bullets.map((b) => (
          <span
            key={b}
            className="inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[11px] font-medium text-white/65"
          >
            {b}
          </span>
        ))}
      </div>

      <div className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[13px] font-semibold text-white">
        {tool.cta}
        <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

/* ────────── HOW IT WORKS ────────── */
function HowItWorks() {
  return (
    <section className="mt-24">
      <div className="text-center">
        <span className="eyebrow">How it works</span>
        <h2 className="mt-3 text-[32px] font-semibold tracking-tight text-white sm:text-[40px]">
          Three steps. Zero fluff.
        </h2>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="surface-1 p-6">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                <s.Icon className="h-4 w-4 text-white/85" strokeWidth={1.75} />
              </span>
              <span className="text-[24px] font-semibold tabular-nums text-white/15">{s.n}</span>
            </div>
            <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-white">{s.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────── FINAL CTA ────────── */
function FinalCta() {
  return (
    <section className="mt-24">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-10 text-center sm:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, rgba(110,123,255,0.18) 0%, rgba(110,123,255,0) 70%)",
          }}
        />
        <div className="relative">
          <span className="eyebrow">Ready when you are</span>
          <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-white sm:text-[38px]">
            Most users get answers<br className="hidden sm:inline" /> in under a minute.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/55">
            Sign in once — get 5 free runs per day, shared across Career Map,
            Resume Studio, and JD Ghost Buster. Your CV is processed by Gemini
            and never stored on our servers.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/map"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#08090A] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_4px_16px_rgba(0,0,0,0.4)] transition hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_8px_32px_rgba(110,123,255,0.25)]"
            >
              <Compass className="h-4 w-4" strokeWidth={2.25} />
              Start with Career Map
              <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-6 py-3 text-[14px] font-medium text-white/80 transition hover:border-white/25 hover:bg-white/[0.04] hover:text-white"
            >
              <Wrench className="h-4 w-4" strokeWidth={2} />
              Or open Resume Studio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

