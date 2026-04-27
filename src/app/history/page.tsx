import Link from "next/link";
import { redirect } from "next/navigation";
import PageChrome from "@/components/PageChrome";
import ContentContainer from "@/components/ContentContainer";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SearchRow {
  id: string;
  target_role: string | null;
  location: string | null;
  created_at: string;
  profile: { primary_industry?: string; seniority?: string } | null;
}

export default async function HistoryPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase
    .from("searches")
    .select("id, target_role, location, created_at, profile")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as SearchRow[];

  return (
    <PageChrome>
      <ContentContainer>
        <h1 className="mb-2 text-3xl font-bold text-white">Your search history</h1>
        <p className="mb-8 text-sm text-white/65">
          The last {rows.length} maps you generated. We never store your CV text — only the
          profile we extracted and what you searched for.
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Couldn&apos;t load history: {error.message}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.03] p-10 text-center">
            <div className="mb-3 text-4xl">🗺️</div>
            <p className="mb-4 text-white/65">No searches yet.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
            >
              Run your first map
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/history/${row.id}`}
                  className="block rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-sm transition hover:border-indigo-400/30 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-white">
                      {row.target_role || row.profile?.primary_industry || "General career map"}
                    </h3>
                    <time className="text-xs text-white/50">
                      {new Date(row.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {row.profile?.seniority && (
                      <span className="rounded-full bg-indigo-400/10 px-2 py-0.5 text-indigo-200">
                        {row.profile.seniority}
                      </span>
                    )}
                    {row.profile?.primary_industry && (
                      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-white/80">
                        {row.profile.primary_industry}
                      </span>
                    )}
                    {row.location && (
                      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-white/80">
                        📍 {row.location}
                      </span>
                    )}
                    <span className="ml-auto text-indigo-300">View →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ContentContainer>
    </PageChrome>
  );
}
