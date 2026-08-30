-- Company 01 growth datastore — production reference.
-- Apply only to a dedicated Supabase project after account/cost approval.
-- Server-only access. The public browser never talks to these tables directly.

create extension if not exists pgcrypto;

create table if not exists public.company01_growth_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organisation text not null check (char_length(organisation) between 1 and 120),
  email text not null check (char_length(email) between 3 and 160),
  explicit_followup_consent boolean not null default false,
  consented_at timestamptz,
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

create table if not exists public.company01_growth_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.company01_growth_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null,
  actor text not null default 'growth_agent',
  authority_decision text check (authority_decision in ('ALLOW','APPROVAL','BLOCK')),
  detail jsonb not null default '{}'::jsonb
);

create table if not exists public.company01_growth_onboarding (
  lead_id uuid primary key references public.company01_growth_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data_mode text not null default 'synthetic' check (data_mode in ('synthetic','non_sensitive','redacted','sensitive','production')),
  workflow_name text,
  human_owner text,
  systems_touched jsonb not null default '[]'::jsonb,
  requested_artifacts jsonb not null default '[]'::jsonb,
  received_artifacts jsonb not null default '[]'::jsonb,
  status text not null default 'requested' check (status in ('requested','collecting','ready','shadow','pilot','paused','completed'))
);

create table if not exists public.company01_growth_approvals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.company01_growth_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  action_type text not null,
  context_digest text not null,
  state text not null default 'requested' check (state in ('requested','approved','denied','expired','consumed')),
  requested_by text not null default 'growth_agent',
  decided_by text,
  decided_at timestamptz
);

create table if not exists public.company01_growth_action_queue (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.company01_growth_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  action_type text not null,
  authority_decision text not null check (authority_decision in ('ALLOW','APPROVAL','BLOCK')),
  state text not null default 'queued' check (state in ('queued','running','completed','failed','cancelled','reconciliation_required')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  idempotency_key text not null unique,
  context_digest text not null,
  provider_ref text,
  last_error_class text
);

alter table public.company01_growth_leads enable row level security;
alter table public.company01_growth_events enable row level security;
alter table public.company01_growth_onboarding enable row level security;
alter table public.company01_growth_approvals enable row level security;
alter table public.company01_growth_action_queue enable row level security;

-- Data API access is opt-in. Only the server-side secret/service role gets access.
revoke all on table public.company01_growth_leads from anon, authenticated;
revoke all on table public.company01_growth_events from anon, authenticated;
revoke all on table public.company01_growth_onboarding from anon, authenticated;
revoke all on table public.company01_growth_approvals from anon, authenticated;
revoke all on table public.company01_growth_action_queue from anon, authenticated;

grant select, insert, update, delete on table public.company01_growth_leads to service_role;
grant select, insert, update, delete on table public.company01_growth_events to service_role;
grant select, insert, update, delete on table public.company01_growth_onboarding to service_role;
grant select, insert, update, delete on table public.company01_growth_approvals to service_role;
grant select, insert, update, delete on table public.company01_growth_action_queue to service_role;
grant usage, select on all sequences in schema public to service_role;

create index if not exists company01_growth_leads_status_idx
  on public.company01_growth_leads(status, created_at desc);
create index if not exists company01_growth_leads_priority_idx
  on public.company01_growth_leads(urgency, readiness_score, created_at desc);
create index if not exists company01_growth_events_lead_idx
  on public.company01_growth_events(lead_id, created_at desc);
create index if not exists company01_growth_queue_state_idx
  on public.company01_growth_action_queue(state, available_at, created_at);
create index if not exists company01_growth_approvals_state_idx
  on public.company01_growth_approvals(state, created_at desc);

-- Atomic inbound creation: one transaction creates the lead and the first audit event.
-- SECURITY INVOKER is intentional: caller permissions still apply.
create or replace function public.company01_create_inbound_lead(
  p_organisation text,
  p_email text,
  p_source text,
  p_sector text,
  p_agent_stage text,
  p_readiness_score integer,
  p_authority_risk_score integer,
  p_consequence_signals integer,
  p_urgency text,
  p_recommended_pilot text,
  p_answers jsonb,
  p_result jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead_id uuid;
begin
  insert into public.company01_growth_leads (
    organisation, email, explicit_followup_consent, consented_at, source,
    sector, agent_stage, readiness_score, authority_risk_score,
    consequence_signals, urgency, recommended_pilot, answers, result,
    status, next_action
  ) values (
    left(trim(p_organisation), 120), lower(left(trim(p_email), 160)), true, now(),
    coalesce(nullif(left(trim(p_source), 80), ''), 'authority_scorecard'),
    nullif(left(trim(p_sector), 40), ''), nullif(left(trim(p_agent_stage), 40), ''),
    p_readiness_score, p_authority_risk_score, p_consequence_signals,
    p_urgency, nullif(left(trim(p_recommended_pilot), 120), ''),
    coalesce(p_answers, '{}'::jsonb), coalesce(p_result, '{}'::jsonb),
    'new', 'qualify_and_prepare_inbound'
  ) returning id into v_lead_id;

  insert into public.company01_growth_events (
    lead_id, event_type, actor, authority_decision, detail
  ) values (
    v_lead_id, 'lead.created_from_explicit_inbound_consent', 'scorecard', 'ALLOW',
    jsonb_build_object('source', coalesce(p_source, 'authority_scorecard'))
  );

  return v_lead_id;
end;
$$;

revoke all on function public.company01_create_inbound_lead(
  text,text,text,text,text,integer,integer,integer,text,text,jsonb,jsonb
) from public, anon, authenticated;
grant execute on function public.company01_create_inbound_lead(
  text,text,text,text,text,integer,integer,integer,text,text,jsonb,jsonb
) to service_role;

-- No anon/authenticated RLS policies are intentionally defined.
-- Before production:
-- 1. configure retention deletion for expired leads,
-- 2. add rate limiting / bot protection at the public API edge,
-- 3. keep SUPABASE_SECRET_KEY server-only,
-- 4. run Supabase security + performance advisors,
-- 5. test allow/deny behavior for anon, authenticated and server roles.
