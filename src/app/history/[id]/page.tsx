import { Compass, Target, CheckCircle2, Rocket, GraduationCap, Wrench, Link2 } from "lucide-react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import PageChrome from "@/components/PageChrome";
import ContentContainer from "@/components/ContentContainer";
import type { MatchResult, GapWithResources, LearningResource } from "@/lib/prompts";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface SearchRow {
  id: string;
  target_role: string | null;
  location: string | null;
  created_at: string;
  result: MatchResult;
}

function resourceUrl(r: LearningResource): string {
  const q = encodeURIComponent(r.search_query || r.title);
  if (r.type === "youtube") return `https://www.youtube.com/results?search_query=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

function resourceIcon(t: LearningResource["type"]): string {
  switch (t) {
    case "youtube":
      return "Play";
    case "course":
      return "Grad";
    case "docs":
      return "Docs";
    case "article":
      return "News";
    case "practice":
      return "Tools";
    default:
      return "Link";
  }
}

function isGapWithResources(g: unknown): g is GapWithResources {
  return typeof g === "object" && g !== null && "skill" in g;
}

export default async function HistoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase
    .from("searches")
    .select("id, target_role, location, created_at, result")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const row = data as unknown as SearchRow;
  const result = row.result;

  const dateLabel = new Date(row.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <PageChrome>
      <ContentContainer width="narrow">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/history" className="flex items-center gap-2 text-sm font-semibold text-white/65 hover:text-white">
            <span>←</span><span>Back to history</span>
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-800"
          >
            Run a fresh map
          </Link>
        </div>
        <header className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">Snapshot · {dateLabel}</div>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            {row.target_role || result.profile?.primary_industry || "Career map"}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {result.profile?.seniority && (
              <span className="rounded-full bg-indigo-400/10 px-2 py-0.5 font-medium text-indigo-200">
                {result.profile.seniority}
              </span>
            )}
            {result.profile?.primary_industry && (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-medium text-white/70">
                {result.profile.primary_industry}
              </span>
            )}
            {row.location && (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-medium text-white/70">
                {row.location}
              </span>
            )}
          </div>
        </header>

        {/* Industry demand */}
        {result.industry_demand && (
          <section className="mb-6 rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-4 text-sm text-white/80">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-indigo-300">Market context at the time</div>
            {result.industry_demand}
          </section>
        )}

        {/* Apply today */}
        {result.apply_today?.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-extrabold text-white"><CheckCircle2 className="mr-1 inline h-5 w-5" /> Apply today</h2>
            <div className="space-y-3">
              {result.apply_today.map((r, i) => (
                <article key={i} className="rounded-xl border border-emerald-400/20 bg-white/[0.03] p-4 shadow-sm">
                  <h3 className="text-base font-bold text-white">{r.title}</h3>
                  {r.why_you_fit && <p className="mt-1 text-sm text-white/70">{r.why_you_fit}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Stretch */}
        {result.stretch_roles?.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-extrabold text-white"><Rocket className="mr-1 inline h-5 w-5" /> Stretch roles (1–2 steps away)</h2>
            <div className="space-y-3">
              {result.stretch_roles.map((r, i) => (
                <article key={i} className="rounded-xl border border-amber-400/20 bg-white/[0.03] p-4 shadow-sm">
                  <h3 className="text-base font-bold text-white">{r.title}</h3>
                  {r.estimated_time_to_ready && (
                    <p className="mt-1 text-xs font-medium text-amber-200">
                      Time to ready: {r.estimated_time_to_ready}
                    </p>
                  )}
                  {r.gaps?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {r.gaps.map((g, j) => {
                        if (!isGapWithResources(g)) {
                          return (
                            <div key={j} className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm">
                              <Target className="mr-1 inline h-3.5 w-3.5" />{String(g)}
                            </div>
                          );
                        }
                        return (
                          <div key={j} className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3">
                            <div className="font-semibold text-white"><Target className="mr-1 inline h-3.5 w-3.5" />{g.skill}</div>
                            {g.why_it_matters && (
                              <div className="mt-0.5 text-sm text-white/70">{g.why_it_matters}</div>
                            )}
                            {g.resources && g.resources.length > 0 && (
                              <ul className="mt-2 space-y-1 text-sm">
                                {g.resources.map((res, k) => (
                                  <li key={k}>
                                    <a
                                      href={resourceUrl(res)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-300 underline hover:text-indigo-200"
                                    >
                                      {resourceIcon(res.type)} {res.title} · {res.provider}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Pivot */}
        {result.pivot_roles?.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">Adjacent paths to consider</h2>
            <div className="space-y-3">
              {result.pivot_roles.map((r, i) => (
                <article key={i} className="rounded-xl border border-purple-400/20 bg-white/[0.03] p-4 shadow-sm">
                  <h3 className="text-base font-bold text-white">{r.title}</h3>
                  {r.why_it_works && <p className="mt-1 text-sm text-white/70">{r.why_it_works}</p>}
                  {r.transferable_skills?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.transferable_skills.map((s, j) => (
                        <span key={j} className="rounded-full bg-purple-400/10 px-2 py-0.5 text-xs font-medium text-purple-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Target role gap */}
        {result.target_role_gap && (
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">
              <Target className="mr-1 inline h-5 w-5" /> Gap to {result.target_role_gap.target}
            </h2>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-sm">
              {typeof result.target_role_gap.overall_readiness === "number" && (
                <div className="mb-3 text-sm">
                  <span className="font-bold">Readiness:</span>{" "}
                  <span className="text-indigo-300">{result.target_role_gap.overall_readiness}%</span>
                </div>
              )}
              {result.target_role_gap.summary && (
                <p className="mb-3 text-sm text-white/70">{result.target_role_gap.summary}</p>
              )}
              {result.target_role_gap.gaps?.length > 0 && (
                <div className="space-y-2">
                  {result.target_role_gap.gaps.map((g, i) => (
                    <div key={i} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{g.skill}</div>
                        {g.severity && (
                          <span className="text-xs font-bold uppercase">{g.severity.replace("_", " ")}</span>
                        )}
                      </div>
                      {g.how_to_close && <div className="mt-1 text-sm">{g.how_to_close}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-800"
          >
            <Compass className="mr-1 inline h-4 w-4" /> Run a fresh map
          </Link>
          <Link
            href="/history"
            className="rounded-lg border border-white/[0.12] bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/90 hover:border-white/20"
          >
            ← Back to history
          </Link>
        </div>
      </ContentContainer>
    </PageChrome>
  );
}
