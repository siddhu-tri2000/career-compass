import { NextResponse } from "next/server";
import { LlmError, roastResumeWithGemini } from "@/lib/gemini";
import type { Tone } from "@/lib/prompts";

const VALID_TONES: ReadonlySet<Tone> = new Set(["roast", "honest", "encouraging"]);
const MIN_RESUME_CHARS = 200;
const MAX_RESUME_CHARS = 25_000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnalyseRequestBody {
  resume?: unknown;
  tone?: unknown;
}

export async function POST(req: Request) {
  let payload: AnalyseRequestBody;
  try {
    payload = (await req.json()) as AnalyseRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const resume = typeof payload.resume === "string" ? payload.resume.trim() : "";
  const tone =
    typeof payload.tone === "string" && VALID_TONES.has(payload.tone as Tone)
      ? (payload.tone as Tone)
      : "roast";

  if (resume.length < MIN_RESUME_CHARS) {
    return NextResponse.json(
      { error: `Paste at least ${MIN_RESUME_CHARS} characters of your CV.` },
      { status: 400 },
    );
  }
  if (resume.length > MAX_RESUME_CHARS) {
    return NextResponse.json(
      { error: `CV is too long. Trim it under ${MAX_RESUME_CHARS} characters.` },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Server is not configured with an API key. Set GEMINI_API_KEY in .env.local — get a free key at https://aistudio.google.com/apikey",
      },
      { status: 503 },
    );
  }

  try {
    const result = await roastResumeWithGemini(resume, tone, apiKey);
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof LlmError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Unexpected /api/analyse error", err);
    return NextResponse.json(
      { error: "Something went wrong analysing your CV. Try again." },
      { status: 500 },
    );
  }
}
