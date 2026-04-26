-- ============================================================================
-- CareerCompass DB schema
-- Run this once in Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- Re-running is safe (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================================

create table if not exists public.searches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  profile       jsonb not null,
  target_role   text,
  location      text,
  result        jsonb not null,
  created_at    timestamptz not null default now()
);

create index if not exists searches_user_idx on public.searches (user_id, created_at desc);
create index if not exists searches_created_idx on public.searches (created_at desc);

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  event_type    text not null,
  payload       jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists events_type_created_idx on public.events (event_type, created_at desc);

alter table public.searches enable row level security;
alter table public.events   enable row level security;

drop policy if exists "users read own searches" on public.searches;
create policy "users read own searches" on public.searches
  for select to authenticated
  using (auth.uid() = user_id);

create or replace view public.public_stats as
select
  (select count(*) from public.searches where created_at > now() - interval '7 days') as searches_7d,
  (select count(*) from public.searches) as searches_total,
  (select count(distinct user_id) from public.searches where user_id is not null) as users_total;

grant select on public.public_stats to anon, authenticated;

-- ============================================================================
-- SKILL JOURNEY (retention loop) — added in feat/skill-journey
-- ============================================================================

create table if not exists public.skill_journeys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  skill         text not null,
  target_role   text,
  source        text,        -- 'stretch' | 'target_gap' | 'manual'
  status        text not null default 'in_progress',  -- 'in_progress' | 'completed' | 'paused'
  why_it_matters text,
  resources     jsonb,       -- snapshot of LearningResource[] at time of tracking
  hours_logged  numeric not null default 0,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  updated_at    timestamptz not null default now()
);

create unique index if not exists skill_journeys_user_skill_uidx
  on public.skill_journeys (user_id, lower(skill));
create index if not exists skill_journeys_user_idx
  on public.skill_journeys (user_id, status, updated_at desc);

create table if not exists public.learning_logs (
  id            uuid primary key default gen_random_uuid(),
  journey_id    uuid not null references public.skill_journeys(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  resource_title text,
  minutes       integer not null check (minutes > 0 and minutes <= 600),
  note          text,
  logged_at     timestamptz not null default now()
);

create index if not exists learning_logs_journey_idx
  on public.learning_logs (journey_id, logged_at desc);
create index if not exists learning_logs_user_idx
  on public.learning_logs (user_id, logged_at desc);

alter table public.skill_journeys enable row level security;
alter table public.learning_logs   enable row level security;

drop policy if exists "users read own journeys" on public.skill_journeys;
create policy "users read own journeys" on public.skill_journeys
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own journeys" on public.skill_journeys;
create policy "users insert own journeys" on public.skill_journeys
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own journeys" on public.skill_journeys;
create policy "users update own journeys" on public.skill_journeys
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own journeys" on public.skill_journeys;
create policy "users delete own journeys" on public.skill_journeys
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users read own logs" on public.learning_logs;
create policy "users read own logs" on public.learning_logs
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own logs" on public.learning_logs;
create policy "users insert own logs" on public.learning_logs
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users delete own logs" on public.learning_logs;
create policy "users delete own logs" on public.learning_logs
  for delete to authenticated
  using (auth.uid() = user_id);

-- ===== Email subscriptions (for weekly digest) =====
create table if not exists public.email_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  email         text not null,
  frequency     text not null default 'weekly' check (frequency in ('weekly')),
  paused        boolean not null default false,
  unsub_token   text not null default gen_random_uuid()::text,
  last_sent_at  timestamptz,
  created_at    timestamptz not null default now()
);

create unique index if not exists email_subscriptions_email_uidx
  on public.email_subscriptions (lower(email));
create index if not exists email_subscriptions_unsub_idx
  on public.email_subscriptions (unsub_token);
create index if not exists email_subscriptions_pending_idx
  on public.email_subscriptions (paused, last_sent_at) where paused = false;

alter table public.email_subscriptions enable row level security;

drop policy if exists "users read own subscription" on public.email_subscriptions;
create policy "users read own subscription" on public.email_subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own subscription" on public.email_subscriptions;
create policy "users insert own subscription" on public.email_subscriptions
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own subscription" on public.email_subscriptions;
create policy "users update own subscription" on public.email_subscriptions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own subscription" on public.email_subscriptions;
create policy "users delete own subscription" on public.email_subscriptions
  for delete to authenticated
  using (auth.uid() = user_id);



-- ===== Resume Studio versions =====
create table if not exists public.studio_versions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  mode          text not null check (mode in ('polish','tailor')),
  name          text,
  original_text text not null,
  jd_text       text,
  output        jsonb not null,
  ats_score     integer,
  created_at    timestamptz not null default now()
);

create index if not exists studio_versions_user_idx
  on public.studio_versions (user_id, created_at desc);

alter table public.studio_versions enable row level security;

drop policy if exists "users read own studio versions" on public.studio_versions;
create policy "users read own studio versions" on public.studio_versions
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own studio versions" on public.studio_versions;
create policy "users insert own studio versions" on public.studio_versions
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users delete own studio versions" on public.studio_versions;
create policy "users delete own studio versions" on public.studio_versions
  for delete to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- FEEDBACK (lightweight quality signal — works for anon + signed-in)
-- ============================================================================
create table if not exists public.feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  surface      text not null check (surface in ('map','studio_polish','studio_tailor','ghost_detect','ghost_diagnose','journey','general')),
  rating       smallint not null check (rating in (-1, 1)),  -- -1 = thumbs down, 1 = thumbs up
  comment      text check (char_length(coalesce(comment,'')) <= 1000),
  context      jsonb,           -- e.g. { target_role, model, ats_score }
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_surface_idx on public.feedback (surface, created_at desc);

alter table public.feedback enable row level security;

-- Inserts go through service-role only (API route), so no insert policy needed.
-- No select policies => nobody can read via anon/auth keys; admin uses service role.

-- ============================================================================
-- DAILY USAGE QUOTA (free tier: 2/day anon · 5/day signed-in, per tool, IST day)
-- ============================================================================
create table if not exists public.usage_daily (
  id            uuid primary key default gen_random_uuid(),
  subject_type  text not null check (subject_type in ('user','ip')),
  subject_key   text not null,         -- user uuid (as text) OR sha256(ip)
  tool          text not null check (tool in ('map','ghost','studio')),
  day_ist       date not null,          -- bucket key in Asia/Kolkata
  count         integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists usage_daily_uq
  on public.usage_daily (subject_type, subject_key, tool, day_ist);

create index if not exists usage_daily_day_idx
  on public.usage_daily (day_ist desc);

alter table public.usage_daily enable row level security;
-- Service-role only (no policies needed for reads/writes via admin client).

-- Atomic increment helper: returns the new count after upsert+increment.
create or replace function public.bump_usage(
  p_subject_type text,
  p_subject_key  text,
  p_tool         text,
  p_day_ist      date
) returns integer
language plpgsql
security definer
as $$
declare
  new_count integer;
begin
  insert into public.usage_daily (subject_type, subject_key, tool, day_ist, count)
  values (p_subject_type, p_subject_key, p_tool, p_day_ist, 1)
  on conflict (subject_type, subject_key, tool, day_ist)
  do update set count = public.usage_daily.count + 1, updated_at = now()
  returning count into new_count;
  return new_count;
end;
$$;

grant execute on function public.bump_usage(text, text, text, date) to service_role;

-- ============================================================================
-- WAITLIST (capture demand for Pro packs when users hit the daily limit)
-- ============================================================================
create table if not exists public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  user_id      uuid references auth.users(id) on delete set null,
  tool         text,                    -- which tool they hit the wall on
  source       text,                    -- 'quota_modal' | 'manual' | etc.
  note         text check (char_length(coalesce(note,'')) <= 500),
  created_at   timestamptz not null default now()
);

create unique index if not exists waitlist_email_uq on public.waitlist (lower(email));
create index if not exists waitlist_created_idx on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;
-- Service-role only.