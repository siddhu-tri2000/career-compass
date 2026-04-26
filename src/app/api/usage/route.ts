import { NextResponse } from "next/server";
import { getTodayUsageSummary } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const summary = await getTodayUsageSummary(req);
    return NextResponse.json(summary);
  } catch (e) {
    console.error("/api/usage failed", e);
    return NextResponse.json({ signedIn: false, limit: 2, byTool: {} }, { status: 200 });
  }
}
