export type Tone = "roast" | "honest" | "encouraging";

// ===== ROAST =====

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

export const ROAST_SCHEMA = {
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

// ===== JOB MATCH =====

export interface RoleSuggestion {
  title: string;
  why_you_fit: string;
}

export type ResourceType = "youtube" | "course" | "docs" | "article" | "practice";

export interface LearningResource {
  title: string;
  provider: string;
  type: ResourceType;
  search_query: string;
  time_estimate: string;
}

export interface GapWithResources {
  skill: string;
  why_it_matters: string;
  resources: LearningResource[];
}

export interface StretchRole {
  title: string;
  gaps: GapWithResources[];
  estimated_time_to_ready: string;
}

export interface PivotRole {
  title: string;
  transferable_skills: string[];
  why_it_works: string;
}

export interface SkillGapItem {
  skill: string;
  severity: "critical" | "important" | "nice_to_have";
  how_to_close: string;
  resources: LearningResource[];
}

export interface CandidateProfile {
  seniority: string;
  years_experience: number;
  primary_industry: string;
  top_skills: string[];
}

export interface MatchResult {
  profile: CandidateProfile;
  apply_today: RoleSuggestion[];
  stretch_roles: StretchRole[];
  pivot_roles: PivotRole[];
  industry_demand: string;
  target_role_gap?: {
    target: string;
    overall_readiness: number;
    gaps: SkillGapItem[];
    summary: string;
  } | null;
}

export function buildMatchPrompt(resume: string, targetRole: string | null): string {
  return `You are a senior career coach who has placed thousands of professionals into roles.

Analyse this resume and produce job-matching recommendations.

${targetRole ? `The user's stated target role is: "${targetRole}". You MUST include the target_role_gap analysis.` : "The user did not specify a target role. Set target_role_gap to null."}

Return a JSON object with this exact shape (no extra keys, no markdown, no prose outside the JSON):

{
  "profile": {
    "seniority": "<e.g. Junior, Mid, Senior, Staff, Director>",
    "years_experience": <integer>,
    "primary_industry": "<e.g. SaaS, Fintech, Healthcare>",
    "top_skills": ["<skill1>", "<skill2>", "<up to 8>"]
  },
  "apply_today": [
    { "title": "<specific role title>", "why_you_fit": "<1-2 sentence explanation>" }
  ],
  "stretch_roles": [
    {
      "title": "<role 1-2 levels up>",
      "gaps": [
        {
          "skill": "<specific missing skill or experience>",
          "why_it_matters": "<one sentence on why closing this gap unlocks the role>",
          "resources": [
            {
              "title": "<concrete resource name e.g. 'Kubernetes for Developers crash course' — be specific>",
              "provider": "<e.g. freeCodeCamp | TechWorld with Nana | Google Cloud Skills Boost | Kubernetes Official Docs | NPTEL | Coursera (free audit) | YouTube>",
              "type": "<one of: youtube | course | docs | article | practice>",
              "search_query": "<exact query a user would type to find this on YouTube/Google — keep under 80 chars and use real terms>",
              "time_estimate": "<e.g. '12 min', '4 hours', '2 weeks · 30 min/day'>"
            }
          ]
        }
      ],
      "estimated_time_to_ready": "<e.g. 6-12 months>"
    }
  ],
  "pivot_roles": [
    {
      "title": "<adjacent role they may not have considered>",
      "transferable_skills": ["<skill1>", "<skill2>"],
      "why_it_works": "<1-2 sentence explanation>"
    }
  ],
  "industry_demand": "<2-3 sentences on which industries are actively hiring this profile right now>",
  "target_role_gap": ${targetRole ? `{
    "target": "${targetRole}",
    "overall_readiness": <integer 0-100>,
    "gaps": [
      {
        "skill": "<missing skill or experience>",
        "severity": "critical|important|nice_to_have",
        "how_to_close": "<specific actionable advice>",
        "resources": [
          {
            "title": "<concrete resource name>",
            "provider": "<e.g. freeCodeCamp | NPTEL | TechWorld with Nana | Official Docs | YouTube>",
            "type": "<youtube | course | docs | article | practice>",
            "search_query": "<exact query under 80 chars>",
            "time_estimate": "<e.g. '20 min', '3 hours', '1 week · 45 min/day'>"
          }
        ]
      }
    ],
    "summary": "<2-3 sentence honest assessment of where they stand>"
  }` : "null"}
}

Rules:
- Provide 3 apply_today roles, 2 stretch_roles, 2 pivot_roles.
- For EVERY gap (in stretch_roles AND target_role_gap): include 2-3 learning resources.
- Resources MUST mix types — at least one free YouTube video and one practice/docs link per gap.
- PREFER free, India-accessible resources: YouTube channels (TechWorld with Nana, freeCodeCamp, Hitesh Choudhary, Akshay Saini, Kunal Kushwaha, ThePrimeagen, Fireship, MIT OCW, NPTEL), official docs (MDN, Kubernetes.io, AWS Skill Builder free tier, Google Cloud Skills Boost free), free courses (freeCodeCamp curriculum, Coursera audit mode, edX audit), practice platforms (LeetCode, NeetCode, Frontend Mentor, Roadmap.sh, Exercism).
- DO NOT invent URLs. ONLY provide search_query — the UI will turn it into a YouTube/Google search link. Search queries must use real, current terminology (no fictional course names).
- Time estimates must be realistic micro-commitments respecting Indian mid-career professionals' bandwidth (e.g., '15 min/day for 2 weeks' beats '40 hours').
- Use REAL, current job titles. Do NOT invent companies. Do NOT quote salary bands.
- Be specific about gaps. "More leadership" is bad. "Experience managing managers, not just ICs" is good.
- For 'severity': critical = blocks them entirely; important = noticeable disadvantage; nice_to_have = polish.
- Be honest. If the resume doesn't support a target role, say so.
- Output JSON ONLY.

RESUME:
"""
${resume}
"""`;
}

export const MATCH_SCHEMA = {
  type: "object",
  properties: {
    profile: {
      type: "object",
      properties: {
        seniority: { type: "string" },
        years_experience: { type: "integer" },
        primary_industry: { type: "string" },
        top_skills: { type: "array", items: { type: "string" } },
      },
      required: ["seniority", "years_experience", "primary_industry", "top_skills"],
    },
    apply_today: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          why_you_fit: { type: "string" },
        },
        required: ["title", "why_you_fit"],
      },
    },
    stretch_roles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill: { type: "string" },
                why_it_matters: { type: "string" },
                resources: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      provider: { type: "string" },
                      type: { type: "string", enum: ["youtube", "course", "docs", "article", "practice"] },
                      search_query: { type: "string" },
                      time_estimate: { type: "string" },
                    },
                    required: ["title", "provider", "type", "search_query", "time_estimate"],
                  },
                },
              },
              required: ["skill", "why_it_matters", "resources"],
            },
          },
          estimated_time_to_ready: { type: "string" },
        },
        required: ["title", "gaps", "estimated_time_to_ready"],
      },
    },
    pivot_roles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          transferable_skills: { type: "array", items: { type: "string" } },
          why_it_works: { type: "string" },
        },
        required: ["title", "transferable_skills", "why_it_works"],
      },
    },
    industry_demand: { type: "string" },
    target_role_gap: {
      type: "object",
      nullable: true,
      properties: {
        target: { type: "string" },
        overall_readiness: { type: "integer" },
        gaps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              skill: { type: "string" },
              severity: { type: "string", enum: ["critical", "important", "nice_to_have"] },
              how_to_close: { type: "string" },
              resources: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    provider: { type: "string" },
                    type: { type: "string", enum: ["youtube", "course", "docs", "article", "practice"] },
                    search_query: { type: "string" },
                    time_estimate: { type: "string" },
                  },
                  required: ["title", "provider", "type", "search_query", "time_estimate"],
                },
              },
            },
            required: ["skill", "severity", "how_to_close", "resources"],
          },
        },
        summary: { type: "string" },
      },
      required: ["target", "overall_readiness", "gaps", "summary"],
    },
  },
  required: [
    "profile",
    "apply_today",
    "stretch_roles",
    "pivot_roles",
    "industry_demand",
  ],
};

// ===== GHOST BUSTER =====

export type GhostMode = "detect" | "diagnose";

export interface GhostFlag {
  type: "red" | "green";
  label: string;
  detail: string;
}

export interface GhostDetectResult {
  trust_score: number;
  verdict: "real" | "sketchy" | "ghost";
  verdict_summary: string;
  flags: GhostFlag[];
  recommendation: string;
}

export interface GhostRejectionReason {
  reason: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

export interface GhostFix {
  action: string;
  example: string;
}

export interface GhostDiagnoseResult {
  fit_score: number;
  fit_summary: string;
  rejection_reasons: GhostRejectionReason[];
  fixes: GhostFix[];
  honest_verdict: string;
}

export function buildGhostDetectPrompt(jd: string): string {
  return `You are a senior recruiter and career coach who has read 10,000+ job descriptions and can spot fake, recycled, or low-quality JDs in seconds.

Analyse the following JOB DESCRIPTION and judge whether it is a legitimate, actively-hiring role or a "ghost job" (reposted forever, no real intent to hire, vague filler, recruiter fishing for resumes, or a copy-paste template).

JOB DESCRIPTION:
"""
${jd}
"""

Return a STRICT JSON object with this exact shape (no extra keys, no markdown, no commentary outside JSON):

{
  "trust_score": <integer 0-100, where 100 = clearly legitimate active role, 0 = obvious ghost/spam>,
  "verdict": "<one of: 'real' | 'sketchy' | 'ghost'>",
  "verdict_summary": "<one short sentence — the headline judgement>",
  "flags": [
    { "type": "<'red' or 'green'>", "label": "<short flag name>", "detail": "<one sentence explanation>" }
  ],
  "recommendation": "<2-3 sentences: should the user apply, apply with caveats, or skip? Be direct.>"
}

RED FLAGS to look for (include those that apply):
- No salary range OR vague range ("competitive", "as per industry")
- Generic title with no team/scope ("Software Engineer" with no specifics)
- Buzzword spam ("rockstar", "ninja", "guru", "wear many hats", "fast-paced")
- Unrealistic skill stack (10+ unrelated tools/languages required)
- Vague responsibilities ("various tasks as assigned")
- No company name, team name, or product mentioned
- Mismatched seniority (asks 10 years exp but offers junior pay)
- Copy-paste template language with no specifics
- Suspicious "urgent hiring, immediate joiners only" without details
- "Looking for someone passionate" with no concrete deliverables
- Indian context: "long-term commitment expected", "no work-from-home", "package as per industry standards" without numbers

GREEN FLAGS to call out (when present):
- Specific salary band in INR (or USD/local currency) with numbers
- Named team / product / specific project
- Concrete tech stack with versions or context
- Clear day-1 / 30-day / 90-day expectations
- Named hiring manager or specific recruiter contact
- Mentions current team size or recent funding
- Specific location with hybrid/remote details
- Specific years-of-experience with reasoning

Aim for 4-7 flags total (mix of red and green). Be honest — if it's a great JD, say so with mostly green flags.

Verdict mapping:
- 75-100 = "real" (apply with confidence)
- 40-74 = "sketchy" (read carefully, manage expectations)
- 0-39 = "ghost" (likely waste of time)

Return ONLY the JSON object.`;
}

export function buildGhostDiagnosePrompt(jd: string, cv: string): string {
  return `You are a senior recruiter and ATS expert who has reviewed thousands of CVs against JDs. The user applied to this role and got NO RESPONSE (ghosted). Your job is to give them honest feedback no real recruiter ever provides.

JOB DESCRIPTION the user applied to:
"""
${jd}
"""

USER'S CV / RESUME:
"""
${cv}
"""

Diagnose the most likely reasons the user was ghosted, and give actionable fixes. Be specific to THIS CV and THIS JD — don't give generic advice.

Return a STRICT JSON object with this exact shape (no extra keys, no markdown, no commentary outside JSON):

{
  "fit_score": <integer 0-100, your honest assessment of how well this CV actually matches this JD>,
  "fit_summary": "<one direct sentence — were they actually a fit or not?>",
  "rejection_reasons": [
    { "reason": "<short label e.g. 'ATS keyword mismatch' | 'Seniority gap' | 'Wrong industry signal' | 'Weak headline' | 'Buried impact' | 'Location/visa mismatch'>",
      "detail": "<2-3 sentences with SPECIFIC evidence from their CV vs the JD>",
      "severity": "<'high' | 'medium' | 'low'>" }
  ],
  "fixes": [
    { "action": "<specific actionable fix>", "example": "<concrete before/after rewrite OR specific keywords to add>" }
  ],
  "honest_verdict": "<2-3 sentences: should they keep applying to roles like this with tweaks, or pivot to better-fitting roles? Tell the truth — don't be falsely encouraging.>"
}

Rules:
- Top 3-5 rejection_reasons ranked by severity (high first).
- Top 3-5 fixes — each must be concrete, not "make it better".
- For ATS issues: name the specific keywords from the JD that are missing from the CV.
- For seniority gaps: name specific scope/scale/responsibility differences.
- For weak phrasing: give a before → after example.
- If the CV is genuinely a strong match and the ghosting is likely the JD's fault (ghost job, internal hire, frozen role), say so plainly in honest_verdict.
- Never invent CV facts. If the CV lacks key info to judge fit, say "CV doesn't show X — add it if true".
- Indian context awareness: be sensitive to Indian CV norms (over-listing of skills, weak action verbs, missing impact metrics) but don't assume.

Return ONLY the JSON object.`;
}

export const GHOST_DETECT_SCHEMA = {
  type: "object",
  properties: {
    trust_score: { type: "integer" },
    verdict: { type: "string", enum: ["real", "sketchy", "ghost"] },
    verdict_summary: { type: "string" },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["red", "green"] },
          label: { type: "string" },
          detail: { type: "string" },
        },
        required: ["type", "label", "detail"],
      },
    },
    recommendation: { type: "string" },
  },
  required: ["trust_score", "verdict", "verdict_summary", "flags", "recommendation"],
};

export const GHOST_DIAGNOSE_SCHEMA = {
  type: "object",
  properties: {
    fit_score: { type: "integer" },
    fit_summary: { type: "string" },
    rejection_reasons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reason: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["reason", "detail", "severity"],
      },
    },
    fixes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          example: { type: "string" },
        },
        required: ["action", "example"],
      },
    },
    honest_verdict: { type: "string" },
  },
  required: ["fit_score", "fit_summary", "rejection_reasons", "fixes", "honest_verdict"],
};

// ===== DAILY PULSE =====

export type PulseType = "trend" | "salary" | "tip" | "opening" | "tool";

export interface PulseInsight {
  headline: string;
  body: string;
  type: PulseType;
  emoji: string;
  source_hint: string;
}

export function buildPulsePrompt(
  profile: { seniority?: string; industry?: string; location?: string; top_skills?: string[] } | null,
  dateISO: string,
): string {
  const ctx = profile
    ? `User profile context (from their last career map):
- Seniority: ${profile.seniority ?? "unknown"}
- Industry: ${profile.industry ?? "unknown"}
- Location: ${profile.location ?? "India (general)"}
- Top skills: ${(profile.top_skills ?? []).slice(0, 6).join(", ") || "unknown"}`
    : `No profile context — generate a generic but useful insight for Indian tech / knowledge professionals.`;

  return `You are a senior career analyst writing a single-card daily insight for a career-mapping app called CareerCompass. Indian audience.

${ctx}

Today is ${dateISO}.

Generate ONE high-signal insight card the user will read in 30 seconds. It must feel fresh, useful, and specific — like a Morning Brew snippet for their career.

Pick ONE type and lean into it:
- "trend": a hiring or skill trend specifically relevant to this profile
- "salary": realistic INR salary intel for their level + city
- "tip": a 60-second actionable career tip (CV phrasing, interview, negotiation, networking)
- "opening": types of roles seeing fresh demand right now for this profile
- "tool": a free tool or resource worth knowing this week

Rotate types day-to-day if invoked repeatedly — pick based on the date if needed.

Return STRICT JSON, no markdown, no commentary:

{
  "headline": "<10 words max — punchy, specific, scannable>",
  "body": "<2-4 short sentences. India-aware. Concrete. No fluff. Mention real terminology, real cities, real salary ranges in INR if relevant.>",
  "type": "<one of: trend | salary | tip | opening | tool>",
  "emoji": "<single emoji that fits the type>",
  "source_hint": "<1 short sentence hinting at where they could verify or learn more — e.g. 'Check Naukri for live counts', 'Cross-check with levels.fyi for global', 'Watch TechWorld with Nana for K8s deep-dives'. Do NOT fabricate URLs.>"
}

Rules:
- Be SPECIFIC. "AI is hot" is bad. "Platform engineering postings up 22% in Bengaluru this quarter, mostly at series-B fintechs" is good.
- INR for India salary numbers (₹38-52L, ₹2.5cr CTC, etc.) — never USD for Indian roles.
- No generic motivational fluff. Treat the user as smart.
- If profile is unknown, write for an Indian mid-career tech professional in 2026.
- One paragraph max in body. Mobile-readable.

Return ONLY the JSON.`;
}

export const PULSE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    body: { type: "string" },
    type: { type: "string", enum: ["trend", "salary", "tip", "opening", "tool"] },
    emoji: { type: "string" },
    source_hint: { type: "string" },
  },
  required: ["headline", "body", "type", "emoji", "source_hint"],
};

