// Merges optional user-supplied "extras" (LinkedIn export + free-form notes)
// into the resume text that gets sent to Gemini. The extras land in a clearly
// delimited block at the end so prompts can call them out as authoritative.

export interface ResumeExtras {
  linkedinText: string;
  linkedinFilename: string | null;
  notes: string;
}

export const EMPTY_EXTRAS: ResumeExtras = {
  linkedinText: "",
  linkedinFilename: null,
  notes: "",
};

export const EXTRAS_LS_KEY = "cc:extras:v1";

// Hard ceiling for the combined extras block. Resume routes accept up to
// 35_000 chars total; budgeting 10k for extras leaves ample headroom for the
// CV body itself.
export const MAX_EXTRAS_CHARS = 10_000;
const LINKEDIN_BUDGET = 8_000;

export function hasExtras(extras: ResumeExtras | null | undefined): boolean {
  if (!extras) return false;
  return extras.linkedinText.trim().length > 0 || extras.notes.trim().length > 0;
}

export function mergeResumeWithExtras(
  resume: string,
  extras: ResumeExtras | null | undefined,
): string {
  if (!hasExtras(extras)) return resume;
  const e = extras as ResumeExtras;

  const linkedin = e.linkedinText.trim();
  const notes = e.notes.trim();

  const liSlice = linkedin.slice(0, LINKEDIN_BUDGET);
  const notesBudget = MAX_EXTRAS_CHARS - liSlice.length;
  const notesSlice = notes.slice(0, Math.max(0, notesBudget));

  const block: string[] = [
    "--- ADDITIONAL CONTEXT FROM USER (authoritative) ---",
  ];
  if (liSlice) {
    block.push("[linkedin_export]", liSlice);
  }
  if (notesSlice) {
    block.push("[user_notes]", notesSlice);
  }
  block.push("--- END ADDITIONAL CONTEXT ---");

  return `${resume.trim()}\n\n${block.join("\n")}`;
}

export function readExtrasFromStorage(): ResumeExtras {
  if (typeof window === "undefined") return { ...EMPTY_EXTRAS };
  try {
    const raw = window.localStorage.getItem(EXTRAS_LS_KEY);
    if (!raw) return { ...EMPTY_EXTRAS };
    const parsed = JSON.parse(raw) as Partial<ResumeExtras>;
    return {
      linkedinText: typeof parsed.linkedinText === "string" ? parsed.linkedinText : "",
      linkedinFilename:
        typeof parsed.linkedinFilename === "string" ? parsed.linkedinFilename : null,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return { ...EMPTY_EXTRAS };
  }
}

export function writeExtrasToStorage(extras: ResumeExtras): void {
  if (typeof window === "undefined") return;
  try {
    if (!hasExtras(extras)) {
      window.localStorage.removeItem(EXTRAS_LS_KEY);
      return;
    }
    window.localStorage.setItem(EXTRAS_LS_KEY, JSON.stringify(extras));
  } catch {
    /* ignore quota */
  }
}
