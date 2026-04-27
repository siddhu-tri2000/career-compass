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
  email: string;
  user_id: string | null;
  tool: string | null;
  source: string | null;
  note: string | null;
  created_at: string;
}

export default async function AdminWaitlistPage() {
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
          <code className="rounded bg-white/[0.05] px-1">ADMIN_EMAILS</code> env var (comma-separated) and redeploy.
        </p>
      </ContentContainer>
      </PageChrome>
    );
  }

  const admin = getAdminSupabase();
  const { data: rowsData } = await admin
    .from("waitlist")
    .select("id,email,user_id,tool,source,note,created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = (rowsData ?? []) as Row[];

  const total = rows.length;
  const byTool = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.tool ?? "(none)";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageChrome>
    <ContentContainer>
      <h1 className="text-2xl font-bold text-white">Waitlist · Pro packs</h1>
      <p className="mt-1 text-sm text-white/65">
        Folks who hit the daily quota and asked to be notified when paid packs launch.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Total signups" value={String(total)} />
        {Object.entries(byTool).map(([tool, count]) => (
          <Stat key={tool} label={`From ${tool}`} value={String(count)} />
        ))}
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs font-semibold uppercase tracking-wide text-white/50">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Tool</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Signed in?</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  Nobody on the waitlist yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/[0.06]">
                <td className="px-4 py-3 font-medium text-white">{r.email}</td>
                <td className="px-4 py-3 text-white/80">{r.tool ?? "—"}</td>
                <td className="px-4 py-3 text-white/80">{r.source ?? "—"}</td>
                <td className="px-4 py-3 text-white/80">{r.user_id ? "yes" : "no"}</td>
                <td className="px-4 py-3 text-white/80">{r.note ?? "—"}</td>
                <td className="px-4 py-3 text-white/50">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContentContainer>
    </PageChrome>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
