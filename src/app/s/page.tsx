import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://career-compass-orpin-tau.vercel.app";

interface SearchParams {
  r?: string;
  l?: string;
  t?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

function clean(s: string | undefined, max: number): string {
  if (!s) return "";
  return s.trim().slice(0, max);
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const role = clean(sp.r, 60);
  const seniority = clean(sp.l, 30);
  const topSkills = clean(sp.t, 200);

  const ogParams = new URLSearchParams();
  if (role) ogParams.set("r", role);
  if (seniority) ogParams.set("l", seniority);
  if (topSkills) ogParams.set("t", topSkills);

  const ogUrl = `${SITE_URL}/api/og${ogParams.toString() ? `?${ogParams.toString()}` : ""}`;

  const title = role
    ? `${role} · I just mapped my career on CareerCompass`
    : "CareerCompass — find the roles you should actually apply for";

  const description = role
    ? `${seniority ? seniority + " · " : ""}${topSkills ? "Top skills: " + topSkills.split(",").slice(0, 3).join(", ") + ". " : ""}Map your own career in 30s.`
    : "Paste your CV. Get a personalised India-aware career map: roles you fit today, stretch roles, and adjacent paths.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: "CareerCompass",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const role = clean(sp.r, 60);
  const seniority = clean(sp.l, 30);
  const topSkills = clean(sp.t, 200)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]">
        <div className="mesh-soft" />
      </div>
      <Link href="/" className="fade-up mb-8 flex items-center gap-2 text-2xl font-extrabold text-neutral-900">
        <span className="text-3xl">🧭</span>
        <span>CareerCompass</span>
      </Link>

      {role ? (
        <>
          <div className="fade-up fade-up-delay-1 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600" />
            A friend just mapped their career →
          </div>
          <h1 className="hero-shimmer fade-up fade-up-delay-2 mt-3 bg-gradient-to-br from-neutral-900 via-indigo-900 to-purple-900 bg-clip-text pb-2 text-4xl font-extrabold leading-[1.15] tracking-tight text-transparent sm:text-5xl">
            {role}
          </h1>
          {seniority && (
            <p className="fade-up fade-up-delay-2 mt-1 text-lg font-semibold text-neutral-600">{seniority} · ready today</p>
          )}
          {topSkills.length > 0 && (
            <div className="fade-up fade-up-delay-3 mt-5 flex flex-wrap items-center justify-center gap-2">
              {topSkills.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-sm font-semibold text-indigo-900 backdrop-blur"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          <p className="fade-up fade-up-delay-3 mt-8 max-w-md text-base text-neutral-700">
            Want your own career map? Paste your CV — India-aware, 5 free runs a day.
          </p>
        </>
      ) : (
        <>
          <h1 className="hero-shimmer fade-up fade-up-delay-1 bg-gradient-to-br from-neutral-900 via-indigo-900 to-purple-900 bg-clip-text pb-2 text-4xl font-extrabold leading-[1.15] tracking-tight text-transparent sm:text-5xl">
            Find the roles you<br />
            <span className="text-indigo-700">should actually</span> apply for.
          </h1>
          <p className="fade-up fade-up-delay-2 mt-5 max-w-xl text-base text-neutral-700">
            Paste your CV. Get a personalised India-aware career map: roles you fit today,
            stretch roles 1–2 steps away, and adjacent paths.
          </p>
        </>
      )}

      <Link
        href="/map"
        className="cta-sheen fade-up fade-up-delay-3 mt-8 inline-flex items-center gap-2 rounded-2xl bg-indigo-700 px-6 py-3.5 text-base font-bold text-white shadow-xl shadow-indigo-300/40 transition hover:-translate-y-0.5 hover:bg-indigo-800"
      >
        🧭 Map my career →
      </Link>

      <div className="fade-up fade-up-delay-3 mt-10 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1 font-semibold text-neutral-700 backdrop-blur">📝 Resume Studio</span>
        <span className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1 font-semibold text-neutral-700 backdrop-blur">👻 JD Ghost Buster</span>
        <span className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1 font-semibold text-neutral-700 backdrop-blur">🧗 Career Journey</span>
      </div>
    </main>
  );
}
