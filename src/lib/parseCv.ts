// Client-side CV file parser. Handles PDF, DOCX, and plain text.
// Returns extracted plain text or throws an Error with a user-friendly message.

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_OUT_CHARS = 35_000;

export type SupportedExt = "pdf" | "docx" | "txt";

export function detectExt(file: File): SupportedExt | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".txt")) return "txt";
  // Fallback to MIME
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (file.type.startsWith("text/")) return "txt";
  return null;
}

export async function parseCvFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large. Keep it under 5 MB.");
  }
  const ext = detectExt(file);
  if (!ext) {
    throw new Error("Unsupported file. Please upload .pdf, .docx, or .txt.");
  }

  let text = "";
  if (ext === "txt") {
    text = await file.text();
  } else if (ext === "pdf") {
    text = await parsePdf(file);
  } else if (ext === "docx") {
    text = await parseDocx(file);
  }

  text = normalise(text);
  if (text.length < 200) {
    throw new Error(
      "Couldn't extract enough text from the file. If it's a scanned PDF, try pasting the text manually.",
    );
  }
  return text.slice(0, MAX_OUT_CHARS);
}

async function parsePdf(file: File): Promise<string> {
  // Dynamic import keeps pdfjs out of the initial JS bundle.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Worker file is copied to /public during install (postinstall script).
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => (item as { str?: string }).str ?? "")
      .join(" ");
    parts.push(pageText);
  }
  return parts.join("\n\n");
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value ?? "";
}

function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u200b]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
