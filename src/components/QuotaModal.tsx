"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Zap } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export type QuotaState =
  | { kind: "sign_in"; tool: "map" | "ghost" | "studio" }
  | { kind: "waitlist"; tool: "map" | "ghost" | "studio" }
  | null;

interface QuotaModalProps {
  state: QuotaState;
  onClose: () => void;
}

const TOOL_LABEL: Record<"map" | "ghost" | "studio", string> = {
  map: "Career Map",
  ghost: "JD Ghost Buster",
  studio: "Resume Studio",
};

export default function QuotaModal({ state, onClose }: QuotaModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [state, onClose]);

  if (!state || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111216] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-[18px] font-semibold tracking-tight text-white">
            {state.kind === "sign_in" ? "Sign in to keep going" : "You've hit today's limit"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-white/40 transition hover:bg-white/[0.05] hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {state.kind === "sign_in" ? (
          <SignInBody tool={state.tool} />
        ) : (
          <WaitlistBody tool={state.tool} onClose={onClose} />
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- SIGN-IN BODY (anonymous request blocked) ---------- */

function SignInBody({ tool }: { tool: "map" | "ghost" | "studio" }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: "google" | "github") {
    setLoading(provider);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) {
        setError(error.message);
        setLoading(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
      setLoading(null);
    }
  }

  return (
    <>
      <p className="mt-1 mb-5 text-[13px] leading-relaxed text-white/60">
        Sign in (one click) to use <strong className="text-white">{TOOL_LABEL[tool]}</strong> —
        you&apos;ll get <strong className="text-white">5 free runs per day</strong>, saved history, and more.
      </p>

      <div className="space-y-2.5">
        <button
          onClick={() => signIn("google")}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[13px] font-semibold text-[#08090A] transition hover:bg-[#0C0D10] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleIcon />
          {loading === "google" ? "Redirecting…" : "Continue with Google"}
        </button>
        <button
          onClick={() => signIn("github")}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-[13px] font-semibold text-white/90 transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GitHubIcon />
          {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-[13px] text-rose-200">{error}</div>
      )}

      <p className="mt-5 text-center text-[11px] text-white/45">
        We never store your raw CV. See our{" "}
        <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-white/75 underline transition hover:text-white">
          Privacy Policy
        </a>
        .
      </p>
    </>
  );
}

/* ---------- WAITLIST BODY (signed-in hit daily cap) ---------- */

function WaitlistBody({
  tool,
  onClose,
}: {
  tool: "map" | "ghost" | "studio";
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tool, source: "quota_modal" }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(data.error ?? "Couldn't save right now. Try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
      setSubmitting(false);
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <div className="mt-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-center">
          <div className="text-4xl">🎉</div>
          <p className="mt-2 text-[14px] font-semibold text-white">You&apos;re on the list.</p>
          <p className="mt-1 text-[12px] text-white/60">
            We&apos;ll email you the moment Pro packs go live — usually 10 runs for ₹500.
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-white px-4 py-2.5 text-[13px] font-semibold text-[#08090A] transition hover:bg-[#0C0D10]"
        >
          Got it
        </button>
      </>
    );
  }

  return (
    <>
      <p className="mt-1 mb-4 text-[13px] leading-relaxed text-white/60">
        You&apos;ve used today&apos;s <strong className="text-white">5 free {TOOL_LABEL[tool]} runs</strong>.
        Quota resets at midnight (IST).
      </p>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
          <Zap className="h-4 w-4 text-amber-400" strokeWidth={2} /> Pro packs launching soon
        </div>
        <p className="mt-1 text-[12px] text-white/60">
          Need more runs today? We&apos;re launching pay-as-you-go packs (10 runs for ₹500). Drop your email — we&apos;ll only email you when it&apos;s live.
        </p>
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-[#6E7BFF] focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-[#08090A] transition hover:bg-[#0C0D10] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "…" : "Notify me"}
          </button>
        </form>
        {error && <div className="mt-2 text-[11px] text-rose-300">{error}</div>}
      </div>

      <button
        onClick={onClose}
        className="mt-4 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-[13px] font-semibold text-white/85 transition hover:border-white/20 hover:bg-white/[0.06]"
      >
        Maybe tomorrow
      </button>
    </>
  );
}

/* ---------- ICONS ---------- */

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16 4.5 9.1 9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.3-11.3-8L6.2 32C9 38 16 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C42.7 35 43.5 30 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}
