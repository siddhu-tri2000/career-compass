import Link from "next/link";

export default function MiniFooter() {
  return (
    <footer className="mx-auto mt-16 max-w-7xl border-t border-neutral-200/70 px-4 py-6 text-xs text-neutral-500 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🧭</span>
          <span className="font-semibold text-neutral-700">CareerCompass</span>
          <span className="text-neutral-300">·</span>
          <span>Honest career advice, free.</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="hover:text-neutral-800">Home</Link>
          <Link href="/privacy" className="hover:text-neutral-800">Privacy</Link>
          <Link href="/terms" className="hover:text-neutral-800">Terms</Link>
          <a
            href="https://github.com/siddhu-tri2000/career-compass"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-800"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
