# 🧭 CareerCompass

> Stop guessing which jobs to apply for.

A login-optional, India-aware AI career-mapping tool. Paste your CV, get a personalised map: roles you fit today, stretch roles 1–2 steps away, and adjacent paths you haven't considered. **5 free runs/day per tool** (anonymous gets 2; sign in for 5).

**Built with:** Next.js 15 · TypeScript · Tailwind · Google Gemini 2.5 Flash

---

## ✨ What makes it different

Most resume tools only fix your CV. They don't tell you **where it should go**.

- 🟢 **Apply Today** — 3 specific roles you're a strong fit for right now
- 🟡 **Stretch Roles** — 1–2 levels up, with named skill gaps and time-to-ready
- 🟣 **Pivot Roles** — adjacent paths your CV actually supports
- 🎯 **Target Role Readiness** — type a dream role, get a 0–100 readiness score + critical/important/nice-to-have skill gaps
- 📊 **Industry Demand Signal** — which industries are actively hiring your profile
- 📝 **Optional CV Assessment** — three tones (Direct / Supportive / Punchy) with section-by-section critique

### Coming next

- ✏️ Section rewriter (before / after weak bullets)
- 📄 PDF / DOCX upload (no copy-paste needed)
- 🔑 BYOK ("Power Mode") — bring your own Gemini / Claude / OpenAI / Groq key
- 💳 Pro packs — pay-as-you-go (10 runs / ₹500) for users who hit the daily quota
- 🚀 Vercel deploy with public URL

---

## 💰 Quotas & pricing

The app is **free to try every day**. To keep our Gemini bill predictable while
we ship, each tool is rate-limited per day (Asia/Kolkata):

| User type     | Career Map | Resume Studio | Ghost Buster |
|---------------|-----------:|--------------:|-------------:|
| Anonymous     |        2/d |           2/d |          2/d |
| Signed-in     |        5/d |           5/d |          5/d |

When users hit the wall, they see a sign-in prompt (anon) or a waitlist
modal for upcoming Pro packs (signed-in). No payment integration yet —
demand is captured in `public.waitlist`.

---

## 🚀 Run locally

### 1. Get a free Gemini API key
Visit [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and create one. **No credit card required.**

> ⚠️ The free tier may use your inputs to improve Google's models. Don't paste highly sensitive resumes against the free tier — switch to a billed Gemini key for production use.

### 2. Install & configure

```bash
git clone https://github.com/siddhu-tri2000/career-compass.git
cd career-compass
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
│   ├── api/
│   │   ├── analyse/route.ts   # CV assessment (the optional roast)
│   │   └── match/route.ts     # Career map (the headline feature)
│   ├── layout.tsx             # Root layout + metadata
│   ├── page.tsx               # Main UI (compass-first, assessment second)
│   └── globals.css            # Tailwind base
└── lib/
    ├── prompts.ts             # Roast + match prompts, JSON schemas, types
    └── gemini.ts              # Generic callGeminiJSON<T>() with model fallback
```

The LLM call lives behind a thin generic function (`callGeminiJSON<T>`) so swapping providers (Groq, Anthropic, OpenAI) later is one file. A 3-model fallback chain handles transient overloads automatically: `gemini-2.5-flash` → `flash-lite` → `2.0-flash`.

---

## 🛣️ Roadmap

| Phase | Feature | Status |
|---|---|---|
| 0 | CV assessment + tone toggle + health score | ✅ |
| 1 | Career Map (Apply / Stretch / Pivot tiers) | ✅ |
| 1 | Skill gap map for target role | ✅ |
| 1 | Industry demand signal | ✅ |
| 2 | Section rewriter (before/after) | ⏳ |
| 2 | PDF/DOCX upload | ⏳ |
| 2 | Mobile polish + loading states | ⏳ |
| 3 | Rate limiting + Cloudflare Turnstile | ⏳ |
| 3 | BYOK Power Mode | ⏳ |
| 4 | Vercel deploy + public launch | ⏳ |

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

_Open source. Built so people can stop applying to the wrong jobs._
