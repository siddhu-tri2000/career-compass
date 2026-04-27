import Link from "next/link";
import type { Metadata } from "next";
import PageChrome from "@/components/PageChrome";
import ContentContainer from "@/components/ContentContainer";

export const metadata: Metadata = {
  title: "Privacy Policy — CareerCompass",
  description:
    "How CareerCompass handles your CV, what we send to Google Gemini, what we store, and your rights.",
};

const LAST_UPDATED = "April 2026";

export default function PrivacyPage() {
  return (
    <PageChrome>
    <ContentContainer width="narrow">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/65 hover:text-white"
      >
        <span>←</span>
        <span>Back to home</span>
      </Link>

      <header className="mb-10">
        <span className="eyebrow">Privacy</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-white/50">Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="space-y-8 text-[15px] leading-relaxed text-white/90">
        <section className="rounded-2xl bg-emerald-400/10 p-5 ring-1 ring-emerald-200/70">
          <h2 className="m-0 text-lg font-bold text-emerald-200">TL;DR</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-emerald-200/90">
            <li>Your CV is processed by <strong>Google Gemini</strong> and is <strong>never stored on our servers</strong>.</li>
            <li>We log anonymous request counts (no CV content) for capacity planning.</li>
            <li>If you sign in, we store your email + your saved analyses so you can come back to them.</li>
            <li>We don&apos;t sell your data. We don&apos;t use it to train models. We don&apos;t share it with advertisers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">1. What we collect</h2>
          <p className="mt-2"><strong>When you use the site without signing in:</strong></p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your CV text and any inputs you type (target role, location, JD, extras).</li>
            <li>Anonymous usage counters: how many analyses ran, error rates. No CV content is logged.</li>
            <li>Standard server logs (IP, user-agent) kept for ≤30 days for abuse protection.</li>
          </ul>
          <p className="mt-3"><strong>When you sign in:</strong></p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your email address and OAuth profile basics (name, avatar) from Google or your chosen provider.</li>
            <li>The analyses you explicitly save to your Journey.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">2. What we send to Google Gemini</h2>
          <p className="mt-2">
            All CV analysis is performed by <a href="https://ai.google.dev/" target="_blank" rel="noreferrer" className="font-semibold text-indigo-300 underline">Google Gemini</a>.
            Each request includes your CV text plus any context you provide (target role, JD, extras).
            Google&apos;s API terms apply to that request — see{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="font-semibold text-indigo-300 underline">Google&apos;s Privacy Policy</a>.
          </p>
          <p className="mt-2">
            Per the Gemini API paid-tier terms, Google does <strong>not</strong> use API content to improve their models.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">3. What we store on our servers</h2>
          <p className="mt-2">
            We use <a href="https://supabase.com" target="_blank" rel="noreferrer" className="font-semibold text-indigo-300 underline">Supabase</a> (Postgres) for:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Authentication records (email, hashed credentials managed by Supabase Auth).</li>
            <li>Analyses <strong>you explicitly save</strong> via the Journey feature.</li>
            <li>Anonymous aggregate counters (request counts, no content).</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> store the raw CV text from anonymous one-off analyses.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">4. Cookies &amp; local storage</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Essential cookies</strong>: Supabase session cookies if you sign in.</li>
            <li><strong>Local storage</strong>: drafts of your CV, target role, and extras so you don&apos;t lose your work between visits. This stays in your browser and is never sent to us unless you submit an analysis.</li>
            <li><strong>Analytics</strong>: Vercel Analytics (privacy-friendly, no third-party cookies).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">5. Your rights</h2>
          <p className="mt-2">You can:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Use the site without signing in.</li>
            <li>Delete any saved analysis from your Journey at any time.</li>
            <li>Request full account deletion by emailing us — see contact below.</li>
            <li>Export your saved data on request.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">6. Children</h2>
          <p className="mt-2">
            CareerCompass is not intended for users under 16. Don&apos;t use it if you&apos;re younger.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">7. Changes to this policy</h2>
          <p className="mt-2">
            If we change anything material, we&apos;ll update the &ldquo;Last updated&rdquo; date and, where it affects you, surface a notice in the app.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">8. Contact</h2>
          <p className="mt-2">
            Privacy questions, deletion requests, or anything else: open an issue at{" "}
            <a href="https://github.com/siddhu-tri2000/career-compass/issues" target="_blank" rel="noreferrer" className="font-semibold text-indigo-300 underline">github.com/siddhu-tri2000/career-compass</a>.
          </p>
        </section>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-6 text-sm text-white/50">
        <Link href="/terms" className="hover:text-white/90">Terms of Service →</Link>
        <Link href="/" className="hover:text-white/90">← Back to home</Link>
      </div>
    </ContentContainer>
    </PageChrome>
  );
}
