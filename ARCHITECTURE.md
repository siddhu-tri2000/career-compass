# CareerCompass — Architecture

> **Last updated:** July 2025 · Next.js 16 · React 19 · Tailwind v4 · Supabase · Gemini AI

CareerCompass is a four-tool AI career toolkit deployed on Vercel.
This document maps every major flow—system topology, request paths,
auth, data, component hierarchy, and deployment—so that any engineer
can orient quickly.

---

## Table of Contents

1. [High-Level System Architecture](#1-high-level-system-architecture)
2. [Request Flows — AI Tools](#2-request-flows--ai-tools)
   - [Career Map](#21-career-map)
   - [Resume Studio](#22-resume-studio)
   - [Ghost Buster](#23-ghost-buster)
   - [Career Journey](#24-career-journey)
3. [Authentication Flow](#3-authentication-flow)
4. [Quota & Rate Limiting](#4-quota--rate-limiting)
5. [JD Extraction Pipeline](#5-jd-extraction-pipeline)
6. [Component Hierarchy](#6-component-hierarchy)
7. [Data Model](#7-data-model)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)

---

## 1. High-Level System Architecture

```mermaid
graph TD
    subgraph Client["Browser"]
        UI["Next.js App<br/>(React 19 + Tailwind v4)"]
    end

    subgraph Vercel["Vercel Edge Network"]
        SSR["Next.js 16 Server<br/>(App Router · Node 18+)"]
        CRON["Cron: /api/cron/weekly-digest<br/>Every Sunday 03:30 UTC"]
    end

    subgraph External["External Services"]
        GEMINI["Google Gemini API<br/>(gemini-2.0-flash)"]
        SUPA_AUTH["Supabase Auth<br/>(Google + GitHub OAuth)"]
        SUPA_DB["Supabase PostgreSQL<br/>(RLS-protected)"]
        REDIS["Upstash Redis<br/>(Rate Limiting)"]
        ADZUNA["Adzuna Jobs API<br/>(Live Listings)"]
        RESEND["Resend<br/>(Email Delivery)"]
    end

    UI -- "fetch /api/*" --> SSR
    SSR -- "Prompt + Parse" --> GEMINI
    SSR -- "Auth check" --> SUPA_AUTH
    SSR -- "Read / Write" --> SUPA_DB
    SSR -- "Rate check" --> REDIS
    SSR -- "Job search" --> ADZUNA
    CRON -- "Send digest" --> RESEND
    CRON -- "Query subscribers" --> SUPA_DB

    style Client fill:#111,stroke:#555,color:#fff
    style Vercel fill:#0a0a0a,stroke:#555,color:#fff
    style External fill:#0a0a0a,stroke:#555,color:#fff
```

---

## 2. Request Flows — AI Tools

### 2.1 Career Map

The flagship tool: paste a resume → get matched roles, a roast/analysis,
daily pulse insights, and the ability to save skill journeys.

```mermaid
sequenceDiagram
    participant U as Browser (map/page.tsx)
    participant M as POST /api/match
    participant A as POST /api/analyse
    participant P as POST /api/pulse
    participant G as Gemini API
    participant DB as Supabase DB
    participant R as Upstash Redis

    U->>M: { resume, target_role?, location? }
    M->>R: checkRateLimit(IP, "match", 10/min)
    R-->>M: allow / 429
    M->>DB: checkQuota(user, "match", 5/day)
    DB-->>M: ok / 401 / 402
    M->>G: matchRolesWithGemini(resume, targetRole)
    G-->>M: { profile, target_roles, stretch_roles }
    M->>DB: INSERT INTO searches (result, profile…)
    M->>DB: bump_usage() RPC
    M-->>U: { result }

    U->>A: { resume, tone: "roast"|"honest"|"encouraging" }
    A->>R: checkRateLimit(IP, "analyse", 10/min)
    A->>G: roastResumeWithGemini(resume, tone)
    G-->>A: { strengths, weaknesses, opportunities }
    A-->>U: { result }

    U->>P: { profile }
    P->>G: pulseInsightWithGemini(profile)
    Note over P: 24h in-memory cache
    G-->>P: { insight, action_items }
    P-->>U: { payload }
```

**Key files:**
| File | Role |
|------|------|
| `src/app/map/page.tsx` | Page component (~1 200 lines, custom grid) |
| `src/app/api/match/route.ts` | Role matching endpoint |
| `src/app/api/analyse/route.ts` | Resume roast / analysis |
| `src/app/api/pulse/route.ts` | Daily career insights |
| `src/lib/gemini.ts` | Gemini client + prompt helpers |
| `src/lib/prompts.ts` | System prompts for match/analyse/pulse |

---

### 2.2 Resume Studio

Three modes — **Polish**, **Tailor** (to a JD), and **Cover Letter** —
plus a DOCX export.

```mermaid
sequenceDiagram
    participant U as Browser (studio/page.tsx)
    participant P as POST /api/studio/polish
    participant T as POST /api/studio/tailor
    participant C as POST /api/studio/cover-letter
    participant E as POST /api/studio/export
    participant G as Gemini API
    participant DB as Supabase DB

    U->>P: { resume, name? }
    P->>DB: checkQuota → 5/day
    P->>G: polishResumeWithGemini(resume)
    G-->>P: { ats_score, refined_resume_text, … }
    P->>DB: INSERT INTO studio_versions (mode='polish')
    P-->>U: { result }

    U->>T: { resume, jd, name? }
    T->>DB: checkQuota → 5/day
    T->>G: tailorResumeWithGemini(resume, jd)
    G-->>T: { tailored_resume, match_keywords, ats_score }
    T->>DB: INSERT INTO studio_versions (mode='tailor')
    T-->>U: { result }

    U->>C: { resume, jd, tone, length, name? }
    C->>DB: checkQuota → 5/day
    C->>G: coverLetterWithGemini(resume, jd, tone, length)
    G-->>C: { cover_letter_text, structure_notes }
    C->>DB: INSERT INTO studio_versions (mode='cover_letter')
    C-->>U: { result }

    U->>E: { text, format }
    E-->>U: Binary .docx stream
```

**Key files:**
| File | Role |
|------|------|
| `src/app/studio/page.tsx` | Page component (Polish / Tailor / CL tabs) |
| `src/app/api/studio/polish/route.ts` | Resume polish endpoint |
| `src/app/api/studio/tailor/route.ts` | Resume tailor endpoint |
| `src/app/api/studio/cover-letter/route.ts` | Cover letter generation |
| `src/app/api/studio/export/route.ts` | DOCX export via `docx` lib |
| `src/lib/studioPrompts.ts` | Prompts for studio tools |

---

### 2.3 Ghost Buster

Two modes: **Detect** (is this JD a ghost listing?) and **Diagnose**
(how well does my CV fit this JD?).

```mermaid
sequenceDiagram
    participant U as Browser (ghost-buster/page.tsx)
    participant API as POST /api/ghost
    participant G as Gemini API
    participant DB as Supabase DB
    participant R as Upstash Redis

    rect rgb(20,20,30)
    Note over U,API: Detect Mode
    U->>API: { mode: "detect", jd }
    API->>R: checkRateLimit(IP, "ghost", 15/min)
    API->>DB: checkQuota(user, 5/day)
    API->>G: ghostDetectWithGemini(jd)
    G-->>API: { verdict, trust_score, flags }
    API->>DB: recordUsage()
    API-->>U: { mode: "detect", result }
    end

    rect rgb(20,30,20)
    Note over U,API: Diagnose Mode
    U->>API: { mode: "diagnose", jd, cv }
    API->>R: checkRateLimit
    API->>DB: checkQuota
    API->>G: ghostDiagnoseWithGemini(jd, cv)
    G-->>API: { fit_score, rejection_reasons, fixes }
    API->>DB: recordUsage()
    API-->>U: { mode: "diagnose", result }
    end
```

**Key files:**
| File | Role |
|------|------|
| `src/app/ghost-buster/page.tsx` | Page component |
| `src/app/api/ghost/route.ts` | Detect + Diagnose endpoint |
| `src/lib/gemini.ts` | `ghostDetectWithGemini`, `ghostDiagnoseWithGemini` |

---

### 2.4 Career Journey

Track skills you're learning — log hours, set goals, and review progress.

```mermaid
sequenceDiagram
    participant U as Browser (journey/page.tsx)
    participant J as /api/journey
    participant L as /api/journey/log
    participant DB as Supabase DB

    U->>J: GET (load all journeys)
    J->>DB: SELECT * FROM skill_journeys WHERE user_id=?
    DB-->>J: [{id, skill, status, hours_logged…}]
    J-->>U: { journeys }

    U->>J: POST { skill, target_role, source… }
    J->>DB: UPSERT skill_journeys (case-insensitive dedup)
    J-->>U: { journey }

    U->>J: PATCH { id, status: "completed" }
    J->>DB: UPDATE skill_journeys SET status=…
    J-->>U: { journey }

    U->>L: POST { journey_id, minutes, note? }
    L->>DB: INSERT INTO learning_logs
    L->>DB: UPDATE skill_journeys SET hours_logged += minutes/60
    L-->>U: { journey }

    U->>L: GET ?journey_id=…
    L->>DB: SELECT * FROM learning_logs WHERE journey_id=?
    L-->>U: { logs }

    U->>J: DELETE { id }
    J->>DB: DELETE FROM skill_journeys WHERE id=?
    J-->>U: 200
```

**Key files:**
| File | Role |
|------|------|
| `src/app/journey/page.tsx` | Page component |
| `src/app/api/journey/route.ts` | CRUD for skill journeys |
| `src/app/api/journey/log/route.ts` | Learning hour logging |

---

## 3. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant AM as AuthModal.tsx
    participant SB as Supabase Auth
    participant P as Google / GitHub
    participant CB as /auth/callback
    participant APP as App (cookies set)

    U->>AM: Click "Sign in with Google"
    AM->>SB: signInWithOAuth({ provider: "google" })
    SB-->>U: Redirect → Google consent
    U->>P: Authorize
    P-->>CB: code + state params
    CB->>SB: exchangeCodeForSession(code)
    SB-->>CB: Session tokens
    CB->>APP: Set HTTP-only cookies
    CB-->>U: Redirect to original page

    Note over APP: All API routes call<br/>supabase.auth.getUser()<br/>to verify session
```

**Key files:**
| File | Role |
|------|------|
| `src/components/AuthModal.tsx` | OAuth trigger UI |
| `src/app/auth/callback/route.ts` | Token exchange + cookie set |
| `src/lib/supabase/server.ts` | `getServerSupabase()` — SSR client |
| `src/lib/supabase/browser.ts` | `getBrowserSupabase()` — client-side |

---

## 4. Quota & Rate Limiting

```mermaid
flowchart TD
    REQ["Incoming API Request"] --> RL{"checkRateLimit<br/>(Upstash Redis)"}
    RL -- "Over limit" --> R429["429 Too Many Requests<br/>+ Retry-After header"]
    RL -- "Under limit" --> AUTH{"supabase.auth.getUser()"}
    AUTH -- "No session" --> R401["401 Sign-in Required"]
    AUTH -- "Signed in" --> ADMIN{"Is admin email?"}
    ADMIN -- "Yes" --> ALLOW["✅ Allow (unlimited)"]
    ADMIN -- "No" --> QUOTA{"checkQuota()<br/>usage_daily table"}
    QUOTA -- "count ≥ 5 today" --> R402["402 Quota Exceeded"]
    QUOTA -- "count < 5" --> ALLOW
    ALLOW --> EXEC["Execute AI call"]
    EXEC --> RECORD["recordUsage()<br/>bump_usage() RPC"]

    style REQ fill:#1a1a2e,stroke:#555,color:#fff
    style ALLOW fill:#0d3320,stroke:#2d6a4f,color:#fff
    style R429 fill:#3d0000,stroke:#a00,color:#fff
    style R401 fill:#3d0000,stroke:#a00,color:#fff
    style R402 fill:#3d2e00,stroke:#a80,color:#fff
```

**Rate-limit buckets (per IP):**

| Bucket | Limit | Window |
|--------|-------|--------|
| `match` | 10 | 60 s |
| `ghost` | 15 | 60 s |
| `analyse` | 10 | 60 s |
| `pulse` | 30 | 60 s |
| `journey` | 60 | 60 s |
| `studio` | 10 | 60 s |
| `feedback` | 20 | 60 s |
| `jobs` | 30 | 60 s |
| `jd-fetch` | 10 | 60 s |
| `subscribe` | 10 | 60 s |

**Quota:** 5 uses / day / user (shared across all AI tools, IST bucket).

**Key files:**
| File | Role |
|------|------|
| `src/lib/usage.ts` | `checkQuota()`, `recordUsage()` |
| `src/lib/rateLimit.ts` | `checkRateLimit()` (Upstash) |

---

## 5. JD Extraction Pipeline

When a user pastes a job-posting URL, the `/api/jd/fetch` route
extracts clean text using a generic three-layer approach with no
site-specific selectors.

```mermaid
flowchart TD
    URL["User submits URL"] --> SSRF{"SSRF Protection<br/>DNS resolve → block private IPs"}
    SSRF -- "Private IP" --> BLOCK["403 Blocked"]
    SSRF -- "Public IP" --> FETCH["fetch(url)<br/>max 2 redirects"]
    FETCH --> HTML["Raw HTML"]

    HTML --> L1{"Layer 1: JSON-LD<br/>script type=application/ld+json"}
    L1 -- "Found JobPosting" --> CLEAN1["✅ Title + Company + Location<br/>+ Description + Qualifications"]
    L1 -- "Not found" --> L2

    L2{"Layer 2: Content-Density Scoring"}
    L2 --> STRIP["Strip chrome<br/>(nav, footer, header, aside, form)"]
    STRIP --> CANDS["Extract candidate blocks<br/>(main, article, section, role=main)"]
    CANDS --> SCORE["scoreBlock() per candidate<br/>• text length<br/>• job keyword hits<br/>• list-item count<br/>• short-line penalty<br/>• repetition penalty"]
    SCORE --> PICK["Pick highest-scored block"]
    PICK -- "≥ 80 chars" --> CLEAN2["✅ Clean text (deduped lines)"]
    PICK -- "< 80 chars" --> L3

    L3{"Layer 3: Meta Fallback"}
    L3 --> META["og:description / description<br/>/ twitter:description"]
    META -- "Found" --> CLEAN3["✅ Meta text"]
    META -- "Not found" --> FAIL["❌ Extraction failed"]

    CLEAN1 --> OUT["Return { text, title, source_url, bytes }<br/>max 12 000 chars"]
    CLEAN2 --> OUT
    CLEAN3 --> OUT

    style URL fill:#1a1a2e,stroke:#555,color:#fff
    style BLOCK fill:#3d0000,stroke:#a00,color:#fff
    style FAIL fill:#3d0000,stroke:#a00,color:#fff
    style CLEAN1 fill:#0d3320,stroke:#2d6a4f,color:#fff
    style CLEAN2 fill:#0d3320,stroke:#2d6a4f,color:#fff
    style CLEAN3 fill:#0d3320,stroke:#2d6a4f,color:#fff
```

**Key file:** `src/app/api/jd/fetch/route.ts`

---

## 6. Component Hierarchy

```mermaid
graph TD
    subgraph Chrome["PageChrome.tsx (client component)"]
        NAV["NavBar.tsx<br/>sticky · h-12 · max-w-6xl"]
        SLOT["{children}"]
        FOOT["MiniFooter.tsx<br/>2-column · max-w-6xl"]
    end

    NAV --> LOGO["Logo + Tool Links"]
    NAV --> EXTRA["navExtra slot<br/>(page-specific buttons)"]
    NAV --> UM["UserMenu.tsx"]
    UM --> AM["AuthModal.tsx"]

    SLOT --> CC["ContentContainer.tsx<br/>narrow(4xl) · default(5xl) · wide(6xl)"]
    CC --> PAGE["Page Content"]

    subgraph Shared["Shared Components"]
        QM["QuotaModal.tsx"]
        QB["QuotaBadge.tsx"]
        JD["JdSourceInput.tsx"]
        CV["CvInput.tsx"]
        FW["FeedbackWidget.tsx"]
        LJ["LiveJobsPanel.tsx"]
        SM["ShareModal.tsx"]
        CL["CoverLetterModal.tsx"]
    end

    PAGE --> Shared

    style Chrome fill:#111,stroke:#444,color:#fff
    style Shared fill:#111,stroke:#444,color:#fff
```

**Page → Width mapping:**

| Page | ContentContainer width | Notes |
|------|----------------------|-------|
| `/` (home) | `wide` (6xl) | Hero is full-bleed above container |
| `/map` | — (no container) | Custom grid layout, uses navExtra |
| `/studio` | `wide` (6xl) | Three-tab UI |
| `/ghost-buster` | `default` (5xl) | Detect / Diagnose tabs |
| `/journey` | `default` (5xl) | Skill cards grid |
| `/history` | `default` (5xl) | Search history list |
| `/history/[id]` | `narrow` (4xl) | Single result detail |
| `/privacy` | `narrow` (4xl) | Legal text |
| `/terms` | `narrow` (4xl) | Legal text |
| `/admin/feedback` | `default` (5xl) | Admin dashboard |
| `/admin/waitlist` | `default` (5xl) | Admin dashboard |
| `/unsubscribe` | `narrow` (4xl) | hideNav — single-purpose |
| `/s` (share) | `narrow` (4xl) | hideNav — public share view |

---

## 7. Data Model

```mermaid
erDiagram
    users ||--o{ searches : "has"
    users ||--o{ skill_journeys : "has"
    users ||--o{ studio_versions : "has"
    users ||--o{ feedback : "has"
    users ||--o{ email_subscriptions : "has"
    users ||--o{ usage_daily : "tracks"
    skill_journeys ||--o{ learning_logs : "has"

    searches {
        uuid id PK
        uuid user_id FK
        jsonb profile
        text target_role
        text location
        jsonb result
        timestamptz created_at
    }

    skill_journeys {
        uuid id PK
        uuid user_id FK
        text skill
        text target_role
        text source
        text status "not_started | in_progress | completed | paused"
        text why_it_matters
        jsonb resources
        float hours_logged
        timestamptz started_at
        timestamptz completed_at
    }

    learning_logs {
        uuid id PK
        uuid journey_id FK
        uuid user_id FK
        text resource_title
        int minutes
        text note
        timestamptz logged_at
    }

    studio_versions {
        uuid id PK
        uuid user_id FK
        text mode "polish | tailor | cover_letter"
        text original_text
        text jd_text
        jsonb output
        int ats_score
        timestamptz created_at
    }

    feedback {
        uuid id PK
        uuid user_id FK
        text surface
        int rating "-1 or 1"
        text comment
        jsonb context
        timestamptz created_at
    }

    email_subscriptions {
        uuid id PK
        uuid user_id FK
        text email
        text frequency
        boolean paused
        text unsub_token
        timestamptz last_sent_at
    }

    usage_daily {
        text subject_type
        text subject_key
        text tool
        date day_ist "IST-bucketed date"
        int count
    }

    events {
        uuid id PK
        uuid user_id FK
        text event_type
        jsonb payload
        timestamptz created_at
    }
```

All user-owned tables enforce **Row Level Security** — each user can
only read and write their own rows.

**Key file:** `supabase/schema.sql`

---

## 8. Deployment & Infrastructure

```mermaid
flowchart LR
    subgraph Dev["Development"]
        CODE["src/"] --> BUILD["npm run build<br/>(next build)"]
        BUILD --> PUSH["git push origin main"]
    end

    subgraph CI["Vercel CI/CD"]
        PUSH --> DEPLOY["Auto-deploy<br/>on push to main"]
        DEPLOY --> EDGE["Vercel Edge Network<br/>career-compass-orpin-tau.vercel.app"]
    end

    subgraph Runtime["Runtime Services"]
        EDGE --> SUPA["Supabase<br/>(Auth + PostgreSQL)"]
        EDGE --> GEM["Gemini API<br/>(AI inference)"]
        EDGE --> UP["Upstash Redis<br/>(rate limits)"]
        EDGE --> ADZ["Adzuna API<br/>(live jobs)"]
        EDGE --> RES["Resend<br/>(emails)"]
    end

    style Dev fill:#111,stroke:#555,color:#fff
    style CI fill:#111,stroke:#555,color:#fff
    style Runtime fill:#111,stroke:#555,color:#fff
```

**Environment variables** (see `.env.example`):

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | ✅ | Google Gemini AI |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase admin key |
| `UPSTASH_REDIS_REST_URL` | Optional | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Rate limiting |
| `ADZUNA_APP_ID` | Optional | Live job listings |
| `ADZUNA_APP_KEY` | Optional | Live job listings |
| `ADMIN_EMAILS` | Optional | Unlimited-quota emails |
| `RESEND_API_KEY` | Optional | Weekly digest emails |

**Cron jobs** (defined in `vercel.json`):

| Path | Schedule | Purpose |
|------|----------|---------|
| `POST /api/cron/weekly-digest` | Sun 03:30 UTC | Send weekly career digest |

---

## File Map

```
src/
├── app/
│   ├── page.tsx                       # Home (hero + feature grid)
│   ├── map/page.tsx                   # Career Map (AI matching)
│   ├── studio/page.tsx                # Resume Studio (polish/tailor/CL)
│   ├── ghost-buster/page.tsx          # Ghost Buster (detect/diagnose)
│   ├── journey/page.tsx               # Career Journey (skill tracker)
│   ├── history/
│   │   ├── page.tsx                   # Search history list
│   │   └── [id]/page.tsx             # Single result detail
│   ├── privacy/page.tsx               # Privacy policy
│   ├── terms/page.tsx                 # Terms of service
│   ├── unsubscribe/page.tsx           # Email unsubscribe
│   ├── s/page.tsx                     # Public share view
│   ├── admin/
│   │   ├── feedback/page.tsx          # Admin: user feedback
│   │   └── waitlist/page.tsx          # Admin: waitlist
│   ├── auth/callback/route.ts         # OAuth callback handler
│   └── api/
│       ├── match/route.ts             # Role matching
│       ├── analyse/route.ts           # Resume analysis / roast
│       ├── ghost/route.ts             # Ghost listing detection
│       ├── pulse/route.ts             # Daily career insights
│       ├── journey/
│       │   ├── route.ts               # Skill journey CRUD
│       │   └── log/route.ts           # Learning hour logging
│       ├── studio/
│       │   ├── polish/route.ts        # Resume polish
│       │   ├── tailor/route.ts        # Resume tailor
│       │   ├── cover-letter/route.ts  # Cover letter generation
│       │   └── export/route.ts        # DOCX export
│       ├── jd/fetch/route.ts          # JD URL extraction (3-layer)
│       ├── jobs/route.ts              # Live job listings (Adzuna)
│       ├── feedback/route.ts          # User feedback
│       ├── subscribe/route.ts         # Email subscription
│       ├── share/route.ts             # Share link generation
│       └── cron/weekly-digest/route.ts # Weekly email digest
├── components/
│   ├── PageChrome.tsx                 # Shared page wrapper (Nav + Footer)
│   ├── ContentContainer.tsx           # Width-standardized container
│   ├── NavBar.tsx                     # Sticky nav bar
│   ├── MiniFooter.tsx                 # Site footer
│   ├── UserMenu.tsx                   # Auth-aware user menu
│   ├── AuthModal.tsx                  # OAuth sign-in modal
│   ├── QuotaModal.tsx                 # Quota exceeded modal
│   ├── QuotaBadge.tsx                 # Usage counter badge
│   ├── JdSourceInput.tsx              # JD textarea + URL fetch
│   ├── CvInput.tsx                    # Resume input (paste + file upload)
│   ├── LiveJobsPanel.tsx              # Live job listings panel
│   ├── LiveStats.tsx                  # Real-time stats display
│   ├── ShareModal.tsx                 # Share career map modal
│   ├── CoverLetterModal.tsx           # Cover letter modal
│   ├── FeedbackWidget.tsx             # Thumbs up/down feedback
│   ├── ExtrasInput.tsx                # Additional CV fields
│   └── SplashBento.tsx                # Landing page hero grid
└── lib/
    ├── gemini.ts                      # Gemini client + all AI functions
    ├── prompts.ts                     # System prompts (match/analyse/pulse)
    ├── studioPrompts.ts               # Studio prompts (polish/tailor/CL)
    ├── usage.ts                       # Quota checking & recording
    ├── rateLimit.ts                   # Upstash rate limiter
    └── supabase/
        ├── server.ts                  # Server-side Supabase client
        └── browser.ts                 # Browser-side Supabase client
```

---

*Diagrams render natively on GitHub. Open this file on
github.com/siddhu-tri2000/career-compass to see interactive charts.*
