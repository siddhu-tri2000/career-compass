import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase, getAdminSupabase } from "@/lib/supabase/server";
import PageChrome from "@/components/PageChrome";
import ContentContainer from "@/components/ContentContainer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseAdmins(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

interface Row {
  id: string;
  user_id: string | null;
  surface: string;
  rating: number;
  comment: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

export default async function AdminFeedbackPage() {
  const supa = await getServerSupabase();
  const {
    data: { user },
  } = await supa.auth.getUser();
  const email = user?.email?.toLowerCase() ?? "";
  const admins = parseAdmins();
  if (!email) redirect("/");
  if (!admins.has(email)) {
    return (
      <PageChrome>
      <ContentContainer>
        <h1 className="text-2xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-white/65">
          Your account ({email}) is not in the admin list. Add it to the{" "}
          <code className="rounded bg-white/[0.05] px-1">ADMIN_EMAILS</code>{" "}
          env var (comma-separated) and redeploy.
        </p>
      </ContentContainer>
      </PageChrome>
    );
  }

  const admin = getAdminSupabase();
  const { data: rowsData } = await admin
    .from("feedback")
    .select("id, user_id, surface, rating, comment, context, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (rowsData ?? []) as Row[];

  const summary: Record<string, { up: number; down: number }> = {};
  for (const r of rows) {
    if (!summary[r.surface]) summary[r.surface] = { up: 0, down: 0 };
    if (r.rating === 1) summary[r.surface].up += 1;
    else if (r.rating === -1) summary[r.surface].down += 1;
  }

  const totalUp = Object.values(summary).reduce((a, b) => a + b.up, 0);
  const totalDown = Object.values(summary).reduce((a, b) => a + b.down, 0);
  const totalAll = totalUp + totalDown;
  const csat = totalAll === 0 ? 0 : Math.round((totalUp / totalAll) * 100);

  return (
    <PageChrome>
    <ContentContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Feedback</h1>
          <p className="mt-1 text-sm text-white/50">
            Last 200 entries. Signed in as {email}.
          </p>
        </div>
        <Link href="/" className="text-sm text-white/50 hover:text-white">
          ← Home
        </Link>
      </div>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total ratings" value={totalAll} />
        <Stat label="Helpful (👍)" value={`${totalUp} (${csat}%)`} />
        <Stat label="Not helpful (👎)" value={totalDown} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">
          By surface
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-white/50">
              <tr>
                <th className="px-4 py-2">Surface</th>
                <th className="px-4 py-2">👍</th>
                <th className="px-4 py-2">👎</th>
                <th className="px-4 py-2">CSAT</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary).map(([surface, c]) => {
                const total = c.up + c.down;
                const pct = total === 0 ? 0 : Math.round((c.up / total) * 100);
                return (
                  <tr key={surface} className="border-t border-white/[0.06]">
                    <td className="px-4 py-2 font-mono text-xs">{surface}</td>
                    <td className="px-4 py-2 text-emerald-300">{c.up}</td>
                    <td className="px-4 py-2 text-rose-300">{c.down}</td>
                    <td className="px-4 py-2">{pct}%</td>
                  </tr>
                );
              })}
              {Object.keys(summary).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-white/35">
                    No feedback yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">
          Recent
        </h2>
        <ul className="mt-3 space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
            >
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span
                  className={
                    r.rating === 1
                      ? "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-200"
                      : "rounded-full bg-rose-100 px-2 py-0.5 text-rose-200"
                  }
                >
                  {r.rating === 1 ? "👍" : "👎"}
                </span>
                <span className="font-mono">{r.surface}</span>
                <span>·</span>
                <span>{new Date(r.created_at).toLocaleString()}</span>
                {r.user_id && <span className="text-white/35">· signed-in</span>}
              </div>
              {r.comment && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-white/90">
                  {r.comment}
                </p>
              )}
              {r.context && Object.keys(r.context).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded bg-white/[0.03] px-2 py-1 text-xs text-white/50">
                  {JSON.stringify(r.context)}
                </pre>
              )}
            </li>
          ))}
          {rows.length === 0 && (
            <li className="text-sm text-white/35">No entries.</li>
          )}
        </ul>
      </section>
    </ContentContainer>
    </PageChrome>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
