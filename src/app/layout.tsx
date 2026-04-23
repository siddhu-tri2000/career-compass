import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerCompass — Find the roles you should actually apply for",
  description:
    "Stop guessing which jobs to apply for. Paste your CV, get a personalised career map: roles you fit today, stretch roles 1–2 steps away, and adjacent paths you haven't considered. Free.",
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
