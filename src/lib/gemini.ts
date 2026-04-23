import type {
  RoastResult,
  Tone,
  MatchResult,
  GhostDetectResult,
  GhostDiagnoseResult,
  PulseInsight,
} from "./prompts";
import {
  buildRoastPrompt,
  buildMatchPrompt,
  buildGhostDetectPrompt,
  buildGhostDiagnosePrompt,
  buildPulsePrompt,
  ROAST_SCHEMA,
  MATCH_SCHEMA,
  GHOST_DETECT_SCHEMA,
  GHOST_DIAGNOSE_SCHEMA,
  PULSE_SCHEMA,
} from "./prompts";

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

interface CallOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

type AttemptResult<T> =
  | { ok: true; result: T }
  | { ok: false; status: number; message: string; retryable: boolean };

async function attemptGemini<T>(
  model: string,
  prompt: string,
  schema: object,
  apiKey: string,
  opts: CallOptions,
): Promise<AttemptResult<T>> {
  const res = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.4,
        maxOutputTokens: opts.maxOutputTokens ?? 8192,
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GeminiResponse;
    const msg = body.error?.message ?? `Gemini API error ${res.status}`;
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
    return { ok: true, result: JSON.parse(text) as T };
  } catch {
    console.error("Gemini returned non-JSON on", model, ":", text.slice(0, 500));
    return { ok: false, status: 502, message: "Could not parse Gemini response as JSON", retryable: true };
  }
}

async function callGeminiJSON<T>(
  prompt: string,
  schema: object,
  apiKey: string,
  opts: CallOptions = {},
): Promise<T> {
  let lastError: { status: number; message: string } | null = null;

  for (const model of GEMINI_MODELS) {
    const attempt = await attemptGemini<T>(model, prompt, schema, apiKey, opts);
    if (attempt.ok) return attempt.result;
    lastError = { status: attempt.status, message: attempt.message };
    if (!attempt.retryable) break;
    console.warn(`Gemini model ${model} failed (${attempt.status}). Trying next…`);
  }

  throw new LlmError(lastError?.message ?? "All Gemini models failed", lastError?.status ?? 502);
}

export async function roastResumeWithGemini(
  resume: string,
  tone: Tone,
  apiKey: string,
): Promise<RoastResult> {
  return callGeminiJSON<RoastResult>(
    buildRoastPrompt(resume, tone),
    ROAST_SCHEMA,
    apiKey,
    { temperature: tone === "roast" ? 0.65 : 0.3 },
  );
}

export async function matchRolesWithGemini(
  resume: string,
  targetRole: string | null,
  apiKey: string,
): Promise<MatchResult> {
  return callGeminiJSON<MatchResult>(
    buildMatchPrompt(resume, targetRole),
    MATCH_SCHEMA,
    apiKey,
    { temperature: 0.3, maxOutputTokens: 12_000 },
  );
}

export async function ghostDetectWithGemini(
  jd: string,
  apiKey: string,
): Promise<GhostDetectResult> {
  return callGeminiJSON<GhostDetectResult>(
    buildGhostDetectPrompt(jd),
    GHOST_DETECT_SCHEMA,
    apiKey,
    { temperature: 0.25, maxOutputTokens: 2048 },
  );
}

export async function ghostDiagnoseWithGemini(
  jd: string,
  cv: string,
  apiKey: string,
): Promise<GhostDiagnoseResult> {
  return callGeminiJSON<GhostDiagnoseResult>(
    buildGhostDiagnosePrompt(jd, cv),
    GHOST_DIAGNOSE_SCHEMA,
    apiKey,
    { temperature: 0.3, maxOutputTokens: 3072 },
  );
}

export async function pulseInsightWithGemini(
  profile: { seniority?: string; industry?: string; location?: string; top_skills?: string[] } | null,
  apiKey: string,
): Promise<PulseInsight> {
  const dateISO = new Date().toISOString().slice(0, 10);
  return callGeminiJSON<PulseInsight>(
    buildPulsePrompt(profile, dateISO),
    PULSE_SCHEMA,
    apiKey,
    { temperature: 0.7, maxOutputTokens: 600 },
  );
}
