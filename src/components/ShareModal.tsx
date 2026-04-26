"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
}

const SHARE_TEXT =
  "🧭 CareerCompass — paste your CV, get a personalised career map in 30 seconds. Roles you fit today, stretch roles 1–2 steps away, and adjacent paths you haven't considered.";

export default function ShareModal({ open, onClose, url }: ShareModalProps) {
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, {
      width: 240,
      margin: 1,
      color: { dark: "#3730a3", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  const encUrl = encodeURIComponent(url);
  const encText = encodeURIComponent(SHARE_TEXT);

  const socials = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encText}%20${encUrl}`,
      bg: "bg-green-600 hover:bg-green-700",
      icon: "💬",
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
      bg: "bg-sky-700 hover:bg-sky-800",
      icon: "💼",
    },
    {
      name: "X / Twitter",
      href: `https://twitter.com/intent/tweet?text=${encText}&url=${encUrl}`,
      bg: "bg-neutral-900 hover:bg-black",
      icon: "𝕏",
    },
    {
      name: "Email",
      href: `mailto:?subject=${encodeURIComponent("Try CareerCompass")}&body=${encText}%20${encUrl}`,
      bg: "bg-neutral-700 hover:bg-neutral-800",
      icon: "✉️",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-neutral-900">Share CareerCompass</h3>
            <p className="mt-1 text-sm text-neutral-600">
              Help a friend find their next role.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mb-5 flex flex-col items-center rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code for CareerCompass" className="h-44 w-44 rounded-md bg-white p-1" />
          ) : (
            <div className="h-44 w-44 animate-pulse rounded-md bg-white" />
          )}
          <p className="mt-3 text-xs font-medium text-indigo-900">
            📱 Scan to open on your phone
          </p>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Share link
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="flex-1 truncate rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-700 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={copyLink}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                copied ? "bg-green-600" : "bg-indigo-700 hover:bg-indigo-800"
              }`}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Or share directly
          </label>
          <div className="grid grid-cols-2 gap-2">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition ${s.bg}`}
              >
                <span className="text-base">{s.icon}</span>
                <span>{s.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
