# 🔥 CV Roast

> Paste your CV. Get roasted. Get fixed. Get told where to apply.

A free, no-login AI tool that gives you brutally honest (or kind, your choice) feedback on your resume — and tells you exactly which jobs you should be applying for.

**Built with:** Next.js 15 · TypeScript · Tailwind · Google Gemini 2.5 Flash

---

## ✨ Features

- 🔥 **Three tones** — Roast (funny), Honest (professional), Encouraging (supportive)
- 📊 **Resume Health Score** — AI-estimated 0–100 score with section-by-section breakdown
- 🎯 **Top 3 fixes** — actionable, specific suggestions
- 🔒 **Private by default** — no login, no database, no resume storage
- 💸 **Free to run** — uses Google Gemini's free tier (1,500 analyses/day)

### Coming next

- ✏️ Section rewriter (before / after)
- 🎯 Job role matcher (Apply / Stretch / Pivot tiers)
- 🧩 Skill gap map
- 📄 PDF upload
- 🔑 BYOK ("Power Mode") — bring your own Gemini / Claude / OpenAI / Groq key

---

## 🚀 Run locally

### 1. Get a free Gemini API key
Visit [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and create one. **No credit card required.**

> ⚠️ The free tier may use your inputs to improve Google's models. Don't paste highly sensitive resumes against the free tier — switch to a billed Gemini key for production.

### 2. Install & configure

```bash
git clone https://github.com/siddhu-tri2000/cv-roast.git
cd cv-roast
npm install
cp .env.example .env.local
# Edit .env.local and paste your GEMINI_API_KEY
```

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000.

---

## 📁 Project structure

```
src/
├── app/
│   ├── api/analyse/route.ts   # POST endpoint — calls Gemini
│   ├── layout.tsx             # Root layout + metadata
│   ├── page.tsx               # Main UI (tone picker, textarea, results)
│   └── globals.css            # Tailwind base
└── lib/
    ├── prompts.ts             # Prompt builder + result types
    └── gemini.ts              # Gemini REST client + JSON-schema enforcement
```

The LLM call lives behind a thin function so swapping providers (Groq, Anthropic, OpenAI) later is one file.

---

## 🛣️ Roadmap

**MVP phases:**

1. ✅ **Phase 0** — Roast, tone toggle, score, section breakdown _(this commit)_
2. ⏳ Phase 1 — Section rewriter + ATS keyword analysis
3. ⏳ Phase 2 — Job role matcher (Tier 1/2/3) + skill gap map
4. ⏳ Phase 3 — PDF upload, mobile polish, one-pager generator
5. ⏳ Phase 4 — Rate limiting, BYOK Power Mode, public launch

---

## 🔐 Privacy

- Your CV is sent to Google's Gemini API for analysis.
- It is **not** stored on our servers — there is no database.
- Free-tier Gemini may use inputs to improve Google's models. We disclose this in the UI.
- For maximum privacy, deploy this yourself with your own billed Gemini key.

---

## 📝 License

MIT — do whatever you want with it. Attribution appreciated.

---

_Built with Claude AI assistance · Inspired by every resume that deserved better feedback._
