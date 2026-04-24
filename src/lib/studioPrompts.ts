// ===== RESUME STUDIO =====
// Two modes: ATS Polish (no JD) and JD Tailor (with JD)

export interface AtsScoreBreakdown {
  overall: number;
  impact: number;
  brevity: number;
  ats_format: number;
  keywords: number;
}

export interface AtsCheck {
  id: string;
  label: string;
  passed: boolean;
  hint: string;
}

export interface BulletRewrite {
  section: string;
  original: string;
  rewritten: string;
  why_better: string;
}

export interface ResumeContact {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface ResumeExperience {
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string; // "Present" if current
  bullets: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  location: string;
  start_date: string;
  end_date: string;
  details: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  link: string;
  bullets: string[];
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  date: string;
}

export interface ResumeSkillGroup {
  category: string;
  items: string[];
}

export interface StructuredResume {
  full_name: string;
  contact: ResumeContact;
  summary: string;
  skills: ResumeSkillGroup[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  certifications: ResumeCertification[];
}

export interface PolishOutput {
  ats_score: AtsScoreBreakdown;
  one_line_summary: string;
  checks: AtsCheck[];
  rewritten_bullets: BulletRewrite[];
  rewritten_summary: string | null;
  top_suggestions: string[];
  structured_resume: StructuredResume;
}

export interface KeywordChip {
  keyword: string;
  importance: "must_have" | "nice_to_have";
}

export interface TailorOutput {
  match_score: number;
  match_reason: string;
  hard_skills_matched: KeywordChip[];
  hard_skills_missing: KeywordChip[];
  soft_skills_matched: KeywordChip[];
  soft_skills_missing: KeywordChip[];
  rewritten_summary: string;
  rewritten_bullets: BulletRewrite[];
  ats_format_warnings: string[];
  cover_letter_hook: string;
  structured_resume: StructuredResume;
}

const ATS_SCORE_RUBRIC = `Score 0-100 on FOUR axes (and an overall):
- impact: Do bullets show measurable outcomes (numbers, %, $, INR, time saved, scale)?
- brevity: Is it under 2 pages, no bloat, no soft padding?
- ats_format: Single column? No tables, headers, footers, images, columns, fancy fonts? Clear sections (Summary, Experience, Skills, Education)?
- keywords: Does it use industry-standard terminology a recruiter would search for?
overall = weighted avg (impact 0.35, keywords 0.25, ats_format 0.25, brevity 0.15), rounded.`;

const ANTI_HALLUCINATION = `CRITICAL: ANTI-HALLUCINATION
- Use ONLY facts present in the resume. NEVER invent numbers, dates, employers, achievements, or technologies.
- If an "ADDITIONAL CONTEXT FROM USER" block appears at the end of the resume, treat its contents (LinkedIn export and/or user notes) as authoritative supplemental facts from the candidate themselves. Use them alongside the CV body. The same anti-invention rule applies — never go beyond what is stated there.
- If a bullet has no numbers and you can't truthfully add one, rewrite it for clarity but DO NOT make up metrics.
- If you genuinely cannot improve a bullet without inventing facts, you may keep "rewritten" identical to "original" and explain in why_better.
- For structured_resume: extract EVERY job, project, education entry, certification you find. Preserve all dates, company names, locations EXACTLY as written. If a field is missing, use empty string "". Never fabricate.`;

const STRUCTURED_RESUME_INSTRUCTIONS = `STRUCTURED RESUME OUTPUT
You must also output a fully-structured rewrite of the resume in "structured_resume". This is what the user will download as a clean ATS-ready Word document.

Rules for structured_resume:
- full_name: extracted exactly from the resume
- contact: parse email, phone, location, linkedin URL, github URL, portfolio URL. Empty string for any not found.
- summary: a polished 2-3 line professional summary (use rewritten_summary if you wrote one, else write one fresh from facts in the CV)
- skills: group skills into 2-5 logical categories like "Languages", "Frameworks", "Tools", "Cloud", "Soft Skills". Each category has an "items" array.
- experience: every job in reverse chronological order. For each: title, company, location, start_date (e.g. "Jan 2022"), end_date (e.g. "Present" or "Mar 2024"), and 3-6 rewritten bullets (action verb start, quantified, ATS-safe). Use the rewrites you already produced where applicable.
- education: every education entry. degree, institution, location, dates, optional details (GPA, honors, relevant coursework).
- projects: notable projects if listed in the CV. Each with name, brief description, link if any, and 1-3 bullets. Empty array if no projects in CV.
- certifications: any certs listed. Empty array if none.
- DO NOT include sections that have zero entries — return empty arrays.
- The structured_resume must be COMPLETE — it is the final downloadable artefact. Don't skip jobs, don't summarise, don't combine entries.`;

const STRUCTURED_RESUME_SCHEMA_FRAGMENT = {
  type: "object",
  properties: {
    full_name: { type: "string" },
    contact: {
      type: "object",
      properties: {
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        linkedin: { type: "string" },
        github: { type: "string" },
        portfolio: { type: "string" },
      },
      required: ["email", "phone", "location", "linkedin", "github", "portfolio"],
    },
    summary: { type: "string" },
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["category", "items"],
      },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          location: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["title", "company", "location", "start_date", "end_date", "bullets"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          degree: { type: "string" },
          institution: { type: "string" },
          location: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          details: { type: "string" },
        },
        required: ["degree", "institution", "location", "start_date", "end_date", "details"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          link: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["name", "description", "link", "bullets"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          date: { type: "string" },
        },
        required: ["name", "issuer", "date"],
      },
    },
  },
  required: ["full_name", "contact", "summary", "skills", "experience", "education", "projects", "certifications"],
};

export function buildPolishPrompt(resume: string): string {
  return `You are an expert ATS resume reviewer who has rewritten thousands of resumes for top recruiters at Google, Microsoft, McKinsey, and India's top product companies.

Your job: take this resume and produce an ATS-friendly rewrite with a score and per-bullet improvements.

${ANTI_HALLUCINATION}

${ATS_SCORE_RUBRIC}

${STRUCTURED_RESUME_INSTRUCTIONS}

Return STRICT JSON, no markdown, no commentary outside the JSON:

{
  "ats_score": {
    "overall": <0-100 int>,
    "impact": <0-100 int>,
    "brevity": <0-100 int>,
    "ats_format": <0-100 int>,
    "keywords": <0-100 int>
  },
  "one_line_summary": "<one honest sentence summarising the resume's current state>",
  "checks": [
    { "id": "single_column", "label": "Single-column layout", "passed": <true/false>, "hint": "<one short sentence>" },
    { "id": "no_tables", "label": "No tables or graphics", "passed": <bool>, "hint": "<...>" },
    { "id": "quantified", "label": "Bullets are quantified", "passed": <bool>, "hint": "<...>" },
    { "id": "action_verbs", "label": "Strong action verbs", "passed": <bool>, "hint": "<...>" },
    { "id": "consistent_tense", "label": "Consistent tense", "passed": <bool>, "hint": "<...>" },
    { "id": "summary_present", "label": "Has a professional summary", "passed": <bool>, "hint": "<...>" },
    { "id": "skills_section", "label": "Has a clear skills section", "passed": <bool>, "hint": "<...>" },
    { "id": "ats_safe_format", "label": "Free of headers/footers/images", "passed": <bool>, "hint": "<...>" }
  ],
  "rewritten_summary": "<a 2-3 line professional summary in third person, ATS-friendly. Use only facts from the resume. Or null if you cannot truthfully write one.>",
  "rewritten_bullets": [
    {
      "section": "<e.g. 'Experience — Senior PM at Acme'>",
      "original": "<the original bullet, verbatim>",
      "rewritten": "<rewritten: starts with action verb, quantified if possible, ATS-safe, under 2 lines>",
      "why_better": "<one short sentence>"
    }
  ],
  "top_suggestions": [
    "<3-5 highest-impact, prioritised, actionable suggestions. e.g. 'Add a Skills section with comma-separated keywords for ATS pickup', 'Move Education below Experience for senior roles', etc.>"
  ],
  "structured_resume": <full structured resume — see STRUCTURED RESUME OUTPUT instructions above>
}

Rules:
- Pick the 6-10 highest-impact bullets to rewrite (don't try to rewrite every line).
- Action verbs: led, built, shipped, scaled, drove, owned, reduced, grew, automated, launched, etc.
- Indian context: ₹ for INR amounts. No "USD" for Indian roles unless original says so.
- Be HONEST in scoring. A weak resume should score 40-60. Don't sandbag, don't over-praise.

RESUME:
"""
${resume}
"""

Return ONLY the JSON.`;
}

export const POLISH_SCHEMA = {
  type: "object",
  properties: {
    ats_score: {
      type: "object",
      properties: {
        overall: { type: "integer" },
        impact: { type: "integer" },
        brevity: { type: "integer" },
        ats_format: { type: "integer" },
        keywords: { type: "integer" },
      },
      required: ["overall", "impact", "brevity", "ats_format", "keywords"],
    },
    one_line_summary: { type: "string" },
    checks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          passed: { type: "boolean" },
          hint: { type: "string" },
        },
        required: ["id", "label", "passed", "hint"],
      },
    },
    rewritten_summary: { type: "string", nullable: true },
    rewritten_bullets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          original: { type: "string" },
          rewritten: { type: "string" },
          why_better: { type: "string" },
        },
        required: ["section", "original", "rewritten", "why_better"],
      },
    },
    top_suggestions: { type: "array", items: { type: "string" } },
    structured_resume: STRUCTURED_RESUME_SCHEMA_FRAGMENT,
  },
  required: ["ats_score", "one_line_summary", "checks", "rewritten_bullets", "top_suggestions", "structured_resume"],
};

export function buildTailorPrompt(resume: string, jd: string): string {
  return `You are an expert ATS resume tailor. Recruiters at top Indian and global companies use systems like Greenhouse, Lever, Workday, and Naukri RMS that do keyword-based matching first.

Given this resume and this job description, produce:
1. A 0-100 match score (how well this CV would survive the ATS for this JD)
2. The keywords from the JD: which are present in the CV (matched) and which are missing
3. A rewritten professional summary tailored to the JD
4. 6-10 rewritten bullets that surface the right keywords and outcomes for this JD
5. ATS format warnings if any
6. A 1-line cover-letter hook the user can use as the opening line

${ANTI_HALLUCINATION}

${STRUCTURED_RESUME_INSTRUCTIONS}

Match score guidance:
- 80-100: strong fit, recommend applying as-is after these tweaks
- 60-79: real fit, needs the rewrites + likely 1-2 missing skills called out
- 40-59: stretch, missing several must-haves
- below 40: don't apply, pick a closer role

Return STRICT JSON, no markdown:

{
  "match_score": <0-100 int>,
  "match_reason": "<2-3 sentences explaining the score honestly>",
  "hard_skills_matched": [
    { "keyword": "<exact term as it appears in JD>", "importance": "must_have" | "nice_to_have" }
  ],
  "hard_skills_missing": [
    { "keyword": "<JD term not in CV>", "importance": "must_have" | "nice_to_have" }
  ],
  "soft_skills_matched": [{ "keyword": "<...>", "importance": "<...>" }],
  "soft_skills_missing": [{ "keyword": "<...>", "importance": "<...>" }],
  "rewritten_summary": "<2-3 line summary tailored to the JD, using only facts from the CV. Should naturally include 3-5 of the must-have keywords if truthful.>",
  "rewritten_bullets": [
    {
      "section": "<e.g. 'Experience — Senior PM at Acme'>",
      "original": "<verbatim original bullet>",
      "rewritten": "<rewritten to surface JD keywords + outcomes. Truthful.>",
      "why_better": "<one short sentence on which JD keywords/outcomes this now hits>"
    }
  ],
  "ats_format_warnings": [
    "<short warnings about formatting that would hurt ATS — e.g. 'Resume uses tables in Skills section — flatten to comma-separated list', 'Multiple columns detected', etc. Empty array if none.>"
  ],
  "cover_letter_hook": "<one strong opening sentence the user could paste into a cover letter or recruiter DM>",
  "structured_resume": <full structured resume tailored to this JD — see STRUCTURED RESUME OUTPUT instructions above. Bullets in experience[] should be the JD-tailored versions.>
}

Rules:
- Hard skills = technologies, tools, frameworks, methodologies, certifications, domain terms
- Soft skills = leadership, communication, ownership, etc. (less weight)
- Pull keywords as they appear in the JD (preserve casing, e.g. "Kubernetes" not "kubernetes")
- 8-15 keywords total per matched/missing category, prioritised by importance
- Indian context: ₹ for INR. No fabricated metrics ever.
- If JD is for a role the CV is clearly unqualified for (e.g. 1yr exp applying to VP role), say so honestly in match_reason and score it low.

RESUME:
"""
${resume}
"""

JOB DESCRIPTION:
"""
${jd}
"""

Return ONLY the JSON.`;
}

const KEYWORD_CHIP_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      keyword: { type: "string" },
      importance: { type: "string", enum: ["must_have", "nice_to_have"] },
    },
    required: ["keyword", "importance"],
  },
};

export const TAILOR_SCHEMA = {
  type: "object",
  properties: {
    match_score: { type: "integer" },
    match_reason: { type: "string" },
    hard_skills_matched: KEYWORD_CHIP_SCHEMA,
    hard_skills_missing: KEYWORD_CHIP_SCHEMA,
    soft_skills_matched: KEYWORD_CHIP_SCHEMA,
    soft_skills_missing: KEYWORD_CHIP_SCHEMA,
    rewritten_summary: { type: "string" },
    rewritten_bullets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          original: { type: "string" },
          rewritten: { type: "string" },
          why_better: { type: "string" },
        },
        required: ["section", "original", "rewritten", "why_better"],
      },
    },
    ats_format_warnings: { type: "array", items: { type: "string" } },
    cover_letter_hook: { type: "string" },
    structured_resume: STRUCTURED_RESUME_SCHEMA_FRAGMENT,
  },
  required: [
    "match_score",
    "match_reason",
    "hard_skills_matched",
    "hard_skills_missing",
    "soft_skills_matched",
    "soft_skills_missing",
    "rewritten_summary",
    "rewritten_bullets",
    "ats_format_warnings",
    "cover_letter_hook",
    "structured_resume",
  ],
};
