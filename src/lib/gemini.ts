import type { RoastResult, Tone } from "./prompts";
import { buildRoastPrompt } from "./prompts";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

function geminiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string };
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
  type: "object",
  properties: {
    overall_roast: { type: "string" },
    overall_score: { type: "integer" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          score: { type: "integer" },
          issues: { type: "array", items: { type: "string" } },
          verdict: { type: "string" },
        },
        required: ["name", "score", "issues", "verdict"],
      },
    },
    top_3_fixes: { type: "array", items: { type: "string" } },
  },
  required: ["overall_roast", "overall_score", "sections", "top_3_fixes"],
};

async function callGemini(
  model: string,
  prompt: string,
  tone: Tone,
  apiKey: string,
): Promise<{ ok: true; result: RoastResult } | { ok: false; status: number; message: string; retryable: boolean }> {
  const res = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: tone === "roast" ? 0.65 : 0.3,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GeminiResponse;
    const msg = body.error?.message ?? `Gemini API error ${res.status}`;
    // 429 (rate limit), 503 (overloaded) and 500 (transient) are retryable on a different model
    const retryable = res.status === 429 || res.status === 503 || res.status === 500;
    return { ok: false, status: res.status, message: msg, retryable };
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const finishReason = data.candidates?.[0]?.finishReason;

  if (!text) {
    return {
      ok: false,
      status: 502,
      message: `Empty response from Gemini (finishReason: ${finishReason ?? "unknown"})`,
      retryable: true,
    };
  }

  try {
    return { ok: true, result: JSON.parse(text) as RoastResult };
  } catch {
    console.error("Gemini returned non-JSON text on", model, ":", text.slice(0, 500));
    return {
      ok: false,
      status: 502,
      message: "Could not parse Gemini response as JSON",
      retryable: true,
    };
  }
}

export async function roastResumeWithGemini(
  resume: string,
  tone: Tone,
  apiKey: string,
): Promise<RoastResult> {
  const prompt = buildRoastPrompt(resume, tone);
  let lastError: { status: number; message: string } | null = null;

  for (const model of GEMINI_MODELS) {
    const attempt = await callGemini(model, prompt, tone, apiKey);
    if (attempt.ok) return attempt.result;

    lastError = { status: attempt.status, message: attempt.message };
    if (!attempt.retryable) break;
    console.warn(`Gemini model ${model} failed (${attempt.status}). Trying next…`);
  }

  throw new LlmError(
    lastError?.message ?? "All Gemini models failed",
    lastError?.status ?? 502,
  );
}
