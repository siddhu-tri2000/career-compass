import { NextResponse } from "next/server";
import type { StructuredResume } from "@/lib/studioPrompts";
import type { CoverLetterOutput } from "@/lib/coverLetterPrompts";
import { structuredResumeToLatex, coverLetterToLatex } from "@/lib/latexResume";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExportRequestBody {
  kind?: "resume" | "cover_letter";
  structured_resume?: StructuredResume;
  cover_letter?: CoverLetterOutput;
  filename?: unknown;
}

export async function POST(req: Request) {
  let payload: ExportRequestBody;
  try {
    payload = (await req.json()) as ExportRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const filename = (typeof payload.filename === "string" && payload.filename.trim()
    ? payload.filename.trim()
    : "document").replace(/[^a-z0-9-_]/gi, "_");

  const kind = payload.kind === "cover_letter" ? "cover_letter" : "resume";

  let latex: string;

  if (kind === "cover_letter") {
    const letter = payload.cover_letter;
    if (!letter || !letter.candidate_name || !letter.body_paragraphs?.length) {
      return NextResponse.json({ error: "Missing cover_letter payload" }, { status: 400 });
    }
    latex = coverLetterToLatex(letter);
  } else {
    const sr = payload.structured_resume;
    if (!sr || !sr.full_name) {
      return NextResponse.json({ error: "Missing structured_resume" }, { status: 400 });
    }
    latex = structuredResumeToLatex(sr);
  }

  return new Response(latex, {
    status: 200,
    headers: {
      "Content-Type": "application/x-tex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.tex"`,
      "Cache-Control": "no-store",
    },
  });
}

