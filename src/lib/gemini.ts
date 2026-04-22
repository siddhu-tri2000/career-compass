import type { RoastResult, Tone } from "./prompts";
import { buildRoastPrompt } from "./prompts";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    overall_roast: { type: "STRING" },
    overall_score: { type: "INTEGER" },
    sections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          score: { type: "INTEGER" },
          issues: { type: "ARRAY", items: { type: "STRING" } },
          verdict: { type: "STRING" },
        },
        required: ["name", "score", "issues", "verdict"],
      },
    },
    top_3_fixes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["overall_roast", "overall_score", "sections", "top_3_fixes"],
};

export async function roastResumeWithGemini(
  resume: string,
  tone: Tone,
  apiKey: string,
): Promise<RoastResult> {
  const prompt = buildRoastPrompt(resume, tone);

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: tone === "roast" ? 0.65 : 0.3,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GeminiResponse;
    const msg = body.error?.message ?? `Gemini API error ${res.status}`;
    throw new LlmError(msg, res.status);
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new LlmError("Empty response from Gemini", 502);

  try {
    return JSON.parse(text) as RoastResult;
  } catch {
    throw new LlmError("Could not parse Gemini response as JSON", 502);
  }
}
