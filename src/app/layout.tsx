import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://career-compass-orpin-tau.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CareerCompass — Find the roles you should actually apply for",
  description:
    "Stop guessing which jobs to apply for. Paste your CV, get a personalised career map: roles you fit today, stretch roles 1–2 steps away, and adjacent paths you haven't considered. Free.",
  openGraph: {
    title: "CareerCompass — Find the roles you should actually apply for",
    description:
      "Paste your CV. Get a personalised India-aware career map in 30s. Free.",
    url: SITE_URL,
    siteName: "CareerCompass",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "CareerCompass — find the roles you should actually apply for" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerCompass — Find the roles you should actually apply for",
    description:
      "Paste your CV. Get a personalised India-aware career map in 30s. Free.",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        <div className="aurora" aria-hidden />
        {children}
      </body>
    </html>
  );
}
