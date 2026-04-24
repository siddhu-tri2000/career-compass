import Link from "next/link";
import type { Metadata } from "next";
import UserMenu from "@/components/UserMenu";
import LiveStats from "@/components/LiveStats";

export const metadata: Metadata = {
  title: "CareerCompass — Your AI career toolkit",
  description:
    "Four free AI tools to find the right roles, fix your CV, and figure out why you're being ghosted. Built on Google Gemini. Your data stays private.",
};

type Tool = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  emoji: string;
  surface: string;
  glow: string;
  cta: string;
  ribbon?: string;
};

const TOOLS: Tool[] = [
  {
    href: "/map",
    eyebrow: "Career Map",
    title: "Find roles you should actually apply for.",
    description:
      "Drop your CV. Get a personalised map: roles you fit today, stretch roles 1–2 steps away, and adjacent paths you hadn't considered.",
    bullets: ["🟢 Apply Today", "🟡 Stretch", "🟣 Pivot", "🎯 Target gap"],
    emoji: "🧭",
    surface: "surface-lavender",
    glow: "glow-indigo",
    cta: "Map my career",
    ribbon: "Most popular",
  },
  {
    href: "/studio",
    eyebrow: "Resume Studio",
    title: "Make your CV survive any ATS.",
    description:
      "Recruiter-grade rewrite plus an honest ATS score in 30 seconds. Polish for any job, or tailor to one specific JD — no hallucinations.",
    bullets: ["✨ ATS polish", "🎯 Tailor to JD", "📊 Score breakdown"],
    emoji: "🛠️",
    surface: "surface-mint",
    glow: "glow-emerald",
    cta: "Open Studio",
  },
  {
    href: "/ghost-buster",
    eyebrow: "Ghost Buster",
    title: "Find out why you're being ghosted.",
    description:
      "Paste the JD and your CV. Get a brutally honest forensics report on what's going wrong — keyword gaps, weak proof, format issues, the works.",
    bullets: ["🔍 Honest diagnosis", "🚩 Red flags", "🛠 Fix list"],
    emoji: "👻",
    surface: "surface-rose",
    glow: "glow-pink",
    cta: "Bust the ghost",
    ribbon: "New",
  },
  {
    href: "/journey",
    eyebrow: "My Journey",
    title: "Track your wins. Plan your next step.",
    description:
      "Your saved career maps, ATS scores, and bookmarked roles in one place. Sign in optional — works offline-first too.",
    bullets: ["💾 Saved maps", "📈 Score history", "⭐ Bookmarked roles"],
    emoji: "🧗",
    surface: "surface-sky",
    glow: "glow-soft",
    cta: "View journey",
  },
];

const TRUST_PILLS = [
  { icon: "🔒", label: "CV never stored", surface: "text-emerald-800 ring-1 ring-emerald-200/70 bg-emerald-50" },
  { icon: "✨", label: "Powered by Gemini", surface: "text-indigo-800 ring-1 ring-indigo-200/70 bg-indigo-50" },
  { icon: "🆓", label: "100% free", surface: "text-amber-800 ring-1 ring-amber-200/70 bg-amber-50" },
  { icon: "🇮🇳", label: "India-aware", surface: "text-rose-800 ring-1 ring-rose-200/70 bg-rose-50" },
];

const STEPS = [
  {
    n: "01",
    title: "Pick a tool",
    body: "Career map, CV polish, ghost diagnosis — start wherever you're stuck.",
    emoji: "🎯",
    surface: "surface-butter",
  },
  {
    n: "02",
    title: "Paste your CV",
    body: "PDF, DOCX, or plain text. Parsed in your browser, sent to Gemini, never stored.",
    emoji: "📄",
    surface: "surface-mint",
  },
  {
    n: "03",
    title: "Get honest answers",
    body: "Specific roles, specific gaps, specific rewrites. No motivational fluff.",
    emoji: "💡",
    surface: "surface-lavender",
  },
];

export default function LandingPage() {
  return (
    <main className="relative">
      <Nav />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Hero />
        <FeatureBento />
        <HowItWorks />
        <FinalCta />
        <Footer />
      </div>
    </main>
  );
}

/* ────────── NAV ────────── */
function Nav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-base font-bold text-neutral-900 transition hover:opacity-80"
        >
          <span className="text-2xl">🧭</span>
          <span>CareerCompass</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/map"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            Career Map
          </Link>
          <Link
            href="/studio"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            Studio
          </Link>
          <Link
            href="/ghost-buster"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            Ghost Buster
          </Link>
          <Link
            href="/journey"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            <span className="text-base leading-none">🧗</span>
            <span className="hidden sm:inline">Journey</span>
          </Link>
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}

/* ────────── HERO ────────── */
function Hero() {
  return (
    <header className="pt-12 pb-10 text-center sm:pt-20 sm:pb-14">
      <div className="fade-up mb-5 inline-flex">
        <span className="sticker text-indigo-800">
          <span className="float-y inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-sm">
            <span className="text-[10px]">✦</span>
          </span>
          <span>Your AI career toolkit</span>
          <span className="text-neutral-300">·</span>
          <span className="text-emerald-700">Free forever</span>
        </span>
      </div>

      <h1 className="hero-shimmer fade-up fade-up-delay-1 mx-auto max-w-4xl bg-gradient-to-br from-neutral-900 via-indigo-900 to-purple-900 bg-clip-text pb-2 text-4xl font-extrabold leading-[1.1] tracking-tight text-transparent sm:text-6xl">
        Stop guessing.{" "}
        <span className="relative inline-block whitespace-nowrap text-indigo-700">
          Start moving.
          <svg
            aria-hidden
            viewBox="0 0 220 14"
            preserveAspectRatio="none"
            className="absolute -bottom-1 left-0 h-2.5 w-full text-amber-300/80"
          >
            <path
              d="M2 9 C 60 2, 120 14, 218 5"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </span>
      </h1>

      <p className="fade-up fade-up-delay-2 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">
        Four AI tools that tell you the truth about your career —
        <span className="font-semibold text-neutral-800"> which roles fit</span>,
        <span className="font-semibold text-neutral-800"> what&apos;s breaking your CV</span>, and
        <span className="font-semibold text-neutral-800"> why you&apos;re being ghosted</span>.
      </p>

      <div className="fade-up fade-up-delay-3 mt-7 flex flex-wrap items-center justify-center gap-2">
        {TRUST_PILLS.map((pill) => (
          <span key={pill.label} className={`sticker ${pill.surface}`}>
            <span className="text-sm leading-none">{pill.icon}</span>
            <span>{pill.label}</span>
          </span>
        ))}
        <LiveStats />
      </div>

      <div className="fade-up fade-up-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/map"
          className="cta-sheen squish glow-indigo inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-6 py-3.5 text-base font-bold text-white"
        >
          <span className="text-lg leading-none">🧭</span>
          <span>Map my career</span>
          <span>→</span>
        </Link>
        <a
          href="#tools"
          className="squish inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white px-6 py-3.5 text-base font-semibold text-neutral-800 hover:border-neutral-400"
        >
          Browse all tools
        </a>
      </div>
    </header>
  );
}

/* ────────── BENTO TOOL CARDS ────────── */
function FeatureBento() {
  return (
    <section id="tools" className="scroll-mt-20">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <span className="eyebrow">Pick your tool</span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Four ways to get unstuck.
          </h2>
        </div>
        <span className="hidden text-sm text-neutral-500 sm:inline">
          Each one works on its own. Mix &amp; match.
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {TOOLS.map((tool, i) => (
          <ToolCard key={tool.href} tool={tool} priority={i === 0} />
        ))}
      </div>
    </section>
  );
}

function ToolCard({ tool, priority }: { tool: Tool; priority: boolean }) {
  return (
    <Link
      href={tool.href}
      className={`group squish bento ${tool.surface} ${tool.glow} relative flex flex-col p-6 sm:p-7 ${
        priority ? "md:min-h-[300px]" : ""
      }`}
    >
      {tool.ribbon && (
        <span className="absolute -top-2.5 right-5 inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
          {tool.ribbon === "New" && <span className="float-y">✨</span>}
          {tool.ribbon}
        </span>
      )}

      <div className="mb-3 flex items-center gap-3">
        <span className="float-y inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-2xl shadow-sm ring-1 ring-black/[0.04]">
          {tool.emoji}
        </span>
        <span className="eyebrow">{tool.eyebrow}</span>
      </div>

      <h3 className="text-xl font-extrabold leading-snug tracking-tight text-neutral-900 sm:text-2xl">
        {tool.title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-neutral-700 sm:text-[15px]">
        {tool.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {tool.bullets.map((b) => (
          <span
            key={b}
            className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 ring-1 ring-black/[0.04]"
          >
            {b}
          </span>
        ))}
      </div>

      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900">
        <span>{tool.cta}</span>
        <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}

/* ────────── HOW IT WORKS ────────── */
function HowItWorks() {
  return (
    <section className="mt-16 sm:mt-20">
      <div className="text-center">
        <span className="eyebrow">How it works</span>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
          Three steps. Zero fluff.
        </h2>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className={`squish bento ${s.surface} p-6`}>
            <div className="flex items-center justify-between">
              <span className="float-y inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-2xl shadow-sm ring-1 ring-black/[0.04]">
                {s.emoji}
              </span>
              <span className="text-3xl font-black text-neutral-900/15 tabular-nums">{s.n}</span>
            </div>
            <h3 className="mt-3 text-lg font-extrabold tracking-tight text-neutral-900">
              {s.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────── FINAL CTA ────────── */
function FinalCta() {
  return (
    <section className="mt-16 sm:mt-20">
      <div className="grad-border">
        <div className="relative overflow-hidden rounded-[calc(1.5rem-2px)] bg-white p-8 text-center sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-indigo-200/40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-purple-200/40 blur-3xl"
          />
          <span className="eyebrow">Ready when you are</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            Most users get answers in under a minute.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            Free. No sign-up needed. Your CV is processed by Gemini and never stored on our servers.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/map"
              className="cta-sheen squish glow-indigo inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-6 py-3.5 text-base font-bold text-white"
            >
              <span className="text-lg leading-none">🧭</span>
              <span>Start with Career Map</span>
              <span>→</span>
            </Link>
            <Link
              href="/studio"
              className="squish inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white px-6 py-3.5 text-base font-semibold text-neutral-800 hover:border-neutral-400"
            >
              <span className="text-lg leading-none">🛠️</span>
              <span>Or fix your CV</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────── FOOTER ────────── */
function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200/70 py-8 text-sm text-neutral-500 sm:mt-20">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-base">🧭</span>
          <span className="font-semibold text-neutral-700">CareerCompass</span>
          <span className="text-neutral-300">·</span>
          <span>Honest career advice, free.</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://github.com/siddhu-tri2000/career-compass"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-800"
          >
            GitHub
          </a>
          <Link href="/map" className="hover:text-neutral-800">Career Map</Link>
          <Link href="/studio" className="hover:text-neutral-800">Studio</Link>
          <Link href="/ghost-buster" className="hover:text-neutral-800">Ghost Buster</Link>
          <Link href="/journey" className="hover:text-neutral-800">Journey</Link>
          <span className="text-neutral-300">·</span>
          <Link href="/privacy" className="hover:text-neutral-800">Privacy</Link>
          <Link href="/terms" className="hover:text-neutral-800">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
