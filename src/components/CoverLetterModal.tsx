"use client";

import { useEffect, useState } from "react";
import type {
  CoverLetterOutput,
  CoverLetterTone,
  CoverLetterLength,
} from "@/lib/coverLetterPrompts";
import { coverLetterToPlainText } from "@/lib/coverLetterPrompts";
import type { QuotaState } from "./QuotaModal";

interface CoverLetterModalProps {
  open: boolean;
  onClose: () => void;
  resume: string;
  jd: string;
  candidateName?: string | null;
  /** Bubble up a quota-blocked response so the parent can show its QuotaModal. */
  onQuotaBlocked?: (state: QuotaState) => void;
}

const TONES: { id: CoverLetterTone; label: string; sub: string }[] = [
  { id: "professional", label: "Professional", sub: "Polished, formal" },
  { id: "warm", label: "Warm", sub: "Genuine, human" },
  { id: "direct", label: "Direct", sub: "Punchy, results-led" },
];

const LENGTHS: { id: CoverLetterLength; label: string; sub: string }[] = [
  { id: "short", label: "Short", sub: "~150 words" },
  { id: "standard", label: "Standard", sub: "~280 words" },
  { id: "detailed", label: "Detailed", sub: "~400 words" },
];

export default function CoverLetterModal({
  open,
  onClose,
  resume,
  jd,
  candidateName,
  onQuotaBlocked,
}: CoverLetterModalProps) {
  const [tone, setTone] = useState<CoverLetterTone>("professional");
  const [length, setLength] = useState<CoverLetterLength>("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [letter, setLetter] = useState<CoverLetterOutput | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Reset when reopened
  useEffect(() => {
    if (!open) return;
    setError(null);
    setLetter(null);
    setCopied(false);
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function generate() {
    setError(null);
    setLetter(null);
    setLoading(true);
    try {
      const res = await fetch("/api/studio/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jd, tone, length, name: candidateName ?? null }),
      });
      const data = await res.json();
      if (res.status === 402 && data?.quota) {
        onQuotaBlocked?.(data.quota as QuotaState);
        onClose();
        return;
      }
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Couldn't generate the letter. Try again.");
        return;
      }
      setLetter(data.result as CoverLetterOutput);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(coverLetterToPlainText(letter));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function downloadTex() {
    if (!letter) return;
    setDownloading(true);
    try {
      const baseFilename = `CareerCompass-CoverLetter-${(letter.candidate_name || "letter").replace(/\s+/g, "_")}`;
      const res = await fetch("/api/studio/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "cover_letter", cover_letter: letter, filename: baseFilename }),
      });
      if (!res.ok) throw new Error("Download failed");
      const latex = await res.text();
      const blob = new Blob([latex], { type: "application/x-tex; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseFilename}.tex`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#111216] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Generate cover letter</h2>
            <p className="text-xs text-white/50">Tailored to this JD using only facts from your CV.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-white/50 hover:bg-white/[0.05] hover:text-white/90"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/80">Tone</label>
            <div className="grid grid-cols-3 gap-2">
              {TONES.map((t) => {
                const active = tone === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-purple-500 bg-purple-400/10 ring-1 ring-purple-500/30"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className="text-base">
                      <span className="font-semibold text-white">{t.label}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/50">{t.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/80">Length</label>
            <div className="grid grid-cols-3 gap-2">
              {LENGTHS.map((l) => {
                const active = length === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLength(l.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-indigo-500 bg-indigo-400/10 ring-1 ring-indigo-500/30"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className="font-semibold text-white">{l.label}</div>
                    <div className="mt-0.5 text-[11px] text-white/50">{l.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {!letter && (
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 px-5 py-3 text-sm font-bold text-white shadow-md hover:from-purple-800 hover:to-indigo-800 disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Writing your cover letter…
                </span>
              ) : (
                "Generate cover letter"
              )}
            </button>
          )}

          {error && (
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
              ⚠ {error}
            </div>
          )}

          {letter && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm leading-relaxed text-white">
                <pre className="whitespace-pre-wrap break-words font-sans">{coverLetterToPlainText(letter)}</pre>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/90 hover:bg-white/[0.03]"
                >
                  {copied ? "✓ Copied" : "📋 Copy text"}
                </button>
                <button
                  type="button"
                  onClick={downloadTex}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-800 disabled:opacity-60"
                >
                  {downloading ? "Preparing…" : "📄 Download .tex"}
                </button>
                <button
                  type="button"
                  onClick={generate}
                  disabled={loading}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.03] disabled:opacity-60"
                >
                  {loading ? "Regenerating…" : "🔄 Regenerate"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
