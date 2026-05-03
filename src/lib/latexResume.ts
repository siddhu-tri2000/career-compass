import type {
  StructuredResume,
  ResumeExperience,
  ResumeEducation,
  ResumeProject,
  ResumeCertification,
  ResumeSkillGroup,
} from "@/lib/studioPrompts";
import type { CoverLetterOutput } from "@/lib/coverLetterPrompts";

// --- LaTeX character escaping ---

const TEX_SPECIAL: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  "$": "\\$",
  "&": "\\&",
  "#": "\\#",
  "%": "\\%",
  "_": "\\_",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

const TEX_ESCAPE_RE = /[\\{}$&#%_~^]/g;

/** Escape text for LaTeX body content. Handles Unicode gracefully via inputenc/fontenc. */
export function texEscape(text: string): string {
  if (!text) return "";
  return text
    .replace(TEX_ESCAPE_RE, (ch) => TEX_SPECIAL[ch] ?? ch)
    .replace(/\u2013/g, "--") // en dash
    .replace(/\u2014/g, "---") // em dash
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/\u2022/g, "\\textbullet{}") // bullet char
    .replace(/\u00A0/g, "~"); // non-breaking space
}

/** Escape URLs for use inside \href{...}{...}. Minimal escaping — only what breaks TeX parsing. */
function texEscapeUrl(url: string): string {
  if (!url) return "";
  // In \href, we only need to escape # and %
  return url.replace(/%/g, "\\%").replace(/#/g, "\\#");
}

// --- LaTeX template pieces ---

const PREAMBLE = `\\documentclass[11pt,a4paper]{article}

% -- Encoding & fonts --
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}

% -- ATS: ensure PDF text is extractable --
\\input{glyphtounicode}
\\pdfgentounicode=1

% -- Layout --
\\usepackage[margin=0.5in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}

% -- Remove page numbers --
\\pagestyle{empty}

% -- Section formatting --
\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{6pt}

% -- Tight lists --
\\setlist[itemize]{nosep, left=0pt, label=\\textbullet, itemsep=2pt}

% -- Commands --
\\newcommand{\\resumeSubheading}[4]{
  \\noindent\\textbf{#1} \\hfill #2 \\\\
  \\textit{#3} \\hfill \\textit{#4}\\\\[-4pt]
}
\\newcommand{\\resumeProjectHeading}[2]{
  \\noindent\\textbf{#1} \\hfill #2 \\\\[-4pt]
}
`;

// --- Builders ---

function buildContact(c: StructuredResume["contact"]): string {
  const parts: string[] = [];
  if (c.email) parts.push(`\\href{mailto:${texEscapeUrl(c.email)}}{${texEscape(c.email)}}`);
  if (c.phone) parts.push(texEscape(c.phone));
  if (c.location) parts.push(texEscape(c.location));
  if (c.linkedin) parts.push(`\\href{${texEscapeUrl(c.linkedin)}}{LinkedIn}`);
  if (c.github) parts.push(`\\href{${texEscapeUrl(c.github)}}{GitHub}`);
  if (c.portfolio) parts.push(`\\href{${texEscapeUrl(c.portfolio)}}{Portfolio}`);
  return parts.join(" $|$ ");
}

function buildSkills(skills: ResumeSkillGroup[]): string {
  if (!skills?.length) return "";
  const items = skills
    .filter((g) => g?.items?.length)
    .map((g) => `\\textbf{${texEscape(g.category)}:} ${g.items.map(texEscape).join(", ")}`)
    .join(" \\\\\n  ");
  return `
\\section{Skills}
  ${items}
`;
}

function dateRange(start: string, end: string): string {
  const s = (start || "").trim();
  const e = (end || "").trim();
  if (s && e) return `${texEscape(s)} -- ${texEscape(e)}`;
  return texEscape(s || e);
}

function buildExperience(experience: ResumeExperience[]): string {
  if (!experience?.length) return "";
  const entries = experience
    .filter((j) => j)
    .map((job) => {
      const bullets = (job.bullets ?? [])
        .filter((b) => b?.trim())
        .map((b) => `    \\item ${texEscape(b.trim())}`)
        .join("\n");
      const loc = job.location ? texEscape(job.location) : "";
      return `  \\resumeSubheading{${texEscape(job.title)}}{${dateRange(job.start_date, job.end_date)}}{${texEscape(job.company)}}{${loc}}
  \\begin{itemize}
${bullets}
  \\end{itemize}
  \\vspace{2pt}`;
    })
    .join("\n\n");
  return `
\\section{Experience}
${entries}
`;
}

function buildEducation(education: ResumeEducation[]): string {
  if (!education?.length) return "";
  const entries = education
    .filter((e) => e)
    .map((ed) => {
      const loc = ed.location ? texEscape(ed.location) : "";
      const details = ed.details ? `\n  ${texEscape(ed.details)}` : "";
      return `  \\resumeSubheading{${texEscape(ed.degree)}}{${dateRange(ed.start_date, ed.end_date)}}{${texEscape(ed.institution)}}{${loc}}${details}`;
    })
    .join("\n\n");
  return `
\\section{Education}
${entries}
`;
}

function buildProjects(projects: ResumeProject[]): string {
  if (!projects?.length) return "";
  const entries = projects
    .filter((p) => p)
    .map((p) => {
      const link = p.link ? `\\href{${texEscapeUrl(p.link)}}{${texEscape(p.link)}}` : "";
      const desc = p.description ? `\n  \\textit{${texEscape(p.description)}}\\\\[-4pt]` : "";
      const bullets = (p.bullets ?? [])
        .filter((b) => b?.trim())
        .map((b) => `    \\item ${texEscape(b.trim())}`)
        .join("\n");
      const bulletBlock = bullets ? `\n  \\begin{itemize}\n${bullets}\n  \\end{itemize}` : "";
      return `  \\resumeProjectHeading{${texEscape(p.name)}}{${link}}${desc}${bulletBlock}
  \\vspace{2pt}`;
    })
    .join("\n\n");
  return `
\\section{Projects}
${entries}
`;
}

function buildCertifications(certs: ResumeCertification[]): string {
  if (!certs?.length) return "";
  const entries = certs
    .filter((c) => c)
    .map((c) => {
      const left = [c.name, c.issuer].filter(Boolean).map(texEscape).join(" --- ");
      return `  \\resumeProjectHeading{${left}}{${texEscape(c.date || "")}}`;
    })
    .join("\n\n");
  return `
\\section{Certifications}
${entries}
`;
}

/** Generate a complete LaTeX document from a StructuredResume. */
export function structuredResumeToLatex(sr: StructuredResume): string {
  const header = `\\begin{document}

% -- Header --
\\begin{center}
  {\\LARGE\\bfseries ${texEscape(sr.full_name)}} \\\\[4pt]
  ${buildContact(sr.contact)}
\\end{center}
`;

  const summary = sr.summary?.trim()
    ? `\n\\section{Summary}\n${texEscape(sr.summary.trim())}\n`
    : "";

  return [
    PREAMBLE,
    header,
    summary,
    buildSkills(sr.skills ?? []),
    buildExperience(sr.experience ?? []),
    buildProjects(sr.projects ?? []),
    buildEducation(sr.education ?? []),
    buildCertifications(sr.certifications ?? []),
    "\n\\end{document}\n",
  ].join("");
}

/** Generate a LaTeX cover letter from CoverLetterOutput. */
export function coverLetterToLatex(letter: CoverLetterOutput): string {
  const preamble = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[margin=1in]{geometry}
\\usepackage[hidelinks]{hyperref}
\\input{glyphtounicode}
\\pdfgentounicode=1
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{10pt}
`;

  const body = [
    letter.greeting || "Dear Hiring Manager,",
    "",
    letter.opening_hook || "",
    ...(letter.body_paragraphs ?? []),
    "",
    letter.closing || "",
    "",
    letter.signoff || "Sincerely,",
    "",
    letter.candidate_name || "",
  ]
    .map(texEscape)
    .join("\n\n");

  return `${preamble}
\\begin{document}

${body}

\\end{document}
`;
}
