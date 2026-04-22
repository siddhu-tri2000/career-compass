export type Tone = "roast" | "honest" | "encouraging";

export interface SectionFinding {
  name: string;
  score: number;
  issues: string[];
  verdict: string;
}

export interface RoastResult {
  overall_roast: string;
  overall_score: number;
  sections: SectionFinding[];
  top_3_fixes: string[];
}

const TONE_GUIDANCE: Record<Tone, string> = {
  roast:
    "Witty, sharp, slightly brutal — like a brutally honest friend who works in HR. Make people laugh while landing real critique. Never insult the person, only the writing. Use plain English, no jargon.",
  honest:
    "Direct, professional, no jokes. Plain English. Like a senior recruiter giving a straight assessment in 60 seconds. Respect the user's time.",
  encouraging:
    "Supportive and constructive. Frame every issue as an opportunity. Acknowledge what is working before pointing out what to improve. Best for career changers and recent grads.",
};

export function buildRoastPrompt(resume: string, tone: Tone): string {
  return `You are an expert career coach and former tech recruiter reviewing a resume.

TONE: ${tone.toUpperCase()} — ${TONE_GUIDANCE[tone]}

You will return a JSON object with this exact shape (no extra keys, no markdown, no commentary outside the JSON):

{
  "overall_roast": "<2 short paragraphs in the selected tone>",
  "overall_score": <integer 0-100, your honest assessment of resume strength>,
  "sections": [
    {
      "name": "<section name e.g. Summary, Experience, Skills, Education, Formatting>",
      "score": <integer 0-10>,
      "issues": ["<short specific issue>", "<another>"],
      "verdict": "<one-line takeaway>"
    }
  ],
  "top_3_fixes": ["<actionable fix 1>", "<actionable fix 2>", "<actionable fix 3>"]
}

Rules:
- Never fabricate facts about the user. If a section is missing, score it 0 and say so.
- Cover at minimum: Summary, Experience, Skills, Education, Formatting/Length.
- Be specific. "Add numbers" is bad. "Quantify the team-lead bullet under Acme Corp" is good.
- Be conservative with scores. A genuinely strong resume scores 75-85. 90+ is rare.
- Output JSON ONLY. No prose before or after.

RESUME:
"""
${resume}
"""`;
}
