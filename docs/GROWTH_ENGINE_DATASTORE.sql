-- Reference SQL for the dedicated Company 01 growth datastore.
-- Apply only to a dedicated Supabase project after review.

create extension if not exists pgcrypto;

create table if not exists public.company01_growth_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organisation text not null check (char_length(organisation) between 1 and 120),
  email text not null check (char_length(email) between 3 and 160),
  explicit_followup_consent boolean not null default false,
  consented_at timestamptz not null default now(),
  source text not null default 'authority_scorecard',
  sector text,
  agent_stage text,
  readiness_score integer check (readiness_score between 0 and 100),
  authority_risk_score integer check (authority_risk_score between 0 and 100),
  consequence_signals integer check (consequence_signals between 0 and 5),
  urgency text check (urgency in ('low','medium','high')),
  recommended_pilot text,
  answers jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','qualified','contacted','onboarding','pilot','won','lost','do_not_contact')),
  owner text,
  next_action text,
  expires_at timestamptz not null default (now() + interval '180 days')
);

alter table public.company01_growth_leads enable row level security;

-- The public browser must never access the table directly.
revoke all on table public.company01_growth_leads from anon, authenticated;

create index if not exists company01_growth_leads_status_idx
  on public.company01_growth_leads(status, created_at desc);

create index if not exists company01_growth_leads_priority_idx
  on public.company01_growth_leads(urgency, readiness_score, created_at desc);

-- No anon/authenticated RLS policies are intentionally defined.
-- Writes happen only through the server-side /api/leads boundary.
-- Before production: configure retention deletion, rate limiting/bot protection,
-- and run Supabase security/performance advisors.
