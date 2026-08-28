-- HausPilot Digital Employee — production persistence schema candidate
--
-- This file is intentionally not applied to any Supabase project yet.
-- Apply only after a dedicated HausPilot project/environment is chosen.
-- RLS follows current Supabase guidance: exposed public tables have RLS,
-- authenticated policies include explicit ownership/membership predicates,
-- and no authorization decision relies on user_metadata.

create table if not exists public.hauspilot_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.hauspilot_memberships (
  organization_id uuid not null references public.hauspilot_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','reviewer','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.hauspilot_workers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.hauspilot_organizations(id) on delete cascade,
  worker_key text not null,
  display_name text not null,
  role_name text not null,
  workflow text not null check (workflow in ('repair_intake')),
  autonomy_level smallint not null default 2 check (autonomy_level between 0 and 5),
  manager_label text not null,
  reviewer_label text not null,
  authority_contract jsonb not null default '{}'::jsonb,
  activation_state text not null default 'READY_FOR_SHADOW_TEST'
    check (activation_state in ('READY_FOR_SHADOW_TEST','SHADOW','COPILOT','LIMITED_AUTO','WORKFLOW_OWNER','PAUSED','BLOCKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, worker_key)
);

create table if not exists public.hauspilot_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.hauspilot_organizations(id) on delete cascade,
  worker_id uuid not null references public.hauspilot_workers(id) on delete restrict,
  external_case_id text not null,
  workflow text not null,
  status text not null check (status in ('NEW','ACTIVE','WAITING_EXTERNAL','WAITING_HUMAN','SCHEDULED','BLOCKED','RESOLVED','CLOSED')),
  version bigint not null default 1 check (version > 0),
  wake_at timestamptz,
  waiting_for text,
  case_data jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, external_case_id)
);

create table if not exists public.hauspilot_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.hauspilot_organizations(id) on delete cascade,
  case_id uuid not null references public.hauspilot_cases(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  verdict text not null check (verdict in ('ACCEPT','EDIT','REJECT')),
  error_class text,
  correction jsonb,
  review_latency_ms bigint check (review_latency_ms is null or review_latency_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hauspilot_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.hauspilot_organizations(id) on delete cascade,
  case_id uuid references public.hauspilot_cases(id) on delete set null,
  worker_id uuid not null references public.hauspilot_workers(id) on delete restrict,
  action_type text not null,
  decision text not null check (decision in ('AUTO','APPROVAL','BLOCK')),
  idempotency_key text not null,
  execution_allowed boolean not null default false,
  provider_called boolean not null default false,
  outcome text,
  payload jsonb not null default '{}'::jsonb,
  trace jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index if not exists hauspilot_memberships_user_org_idx
  on public.hauspilot_memberships(user_id, organization_id);
create index if not exists hauspilot_workers_org_idx
  on public.hauspilot_workers(organization_id);
create index if not exists hauspilot_cases_org_status_idx
  on public.hauspilot_cases(organization_id, status);
create index if not exists hauspilot_cases_wake_idx
  on public.hauspilot_cases(wake_at)
  where status = 'SCHEDULED';
create index if not exists hauspilot_reviews_org_case_idx
  on public.hauspilot_reviews(organization_id, case_id);
create index if not exists hauspilot_actions_org_case_idx
  on public.hauspilot_actions(organization_id, case_id);

alter table public.hauspilot_organizations enable row level security;
alter table public.hauspilot_memberships enable row level security;
alter table public.hauspilot_workers enable row level security;
alter table public.hauspilot_cases enable row level security;
alter table public.hauspilot_reviews enable row level security;
alter table public.hauspilot_actions enable row level security;

revoke all on table public.hauspilot_organizations from anon;
revoke all on table public.hauspilot_memberships from anon;
revoke all on table public.hauspilot_workers from anon;
revoke all on table public.hauspilot_cases from anon;
revoke all on table public.hauspilot_reviews from anon;
revoke all on table public.hauspilot_actions from anon;

grant select, insert, update on table public.hauspilot_organizations to authenticated;
grant select, insert on table public.hauspilot_memberships to authenticated;
grant select, insert, update on table public.hauspilot_workers to authenticated;
grant select on table public.hauspilot_cases to authenticated;
grant select, insert, update on table public.hauspilot_reviews to authenticated;
grant select on table public.hauspilot_actions to authenticated;

grant select, insert, update, delete on table public.hauspilot_organizations to service_role;
grant select, insert, update, delete on table public.hauspilot_memberships to service_role;
grant select, insert, update, delete on table public.hauspilot_workers to service_role;
grant select, insert, update, delete on table public.hauspilot_cases to service_role;
grant select, insert, update, delete on table public.hauspilot_reviews to service_role;
grant select, insert, update, delete on table public.hauspilot_actions to service_role;

-- Organization bootstrap: a signed-in user may create only an organization they own.
drop policy if exists "hauspilot_org_insert_owner" on public.hauspilot_organizations;
create policy "hauspilot_org_insert_owner"
on public.hauspilot_organizations
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = created_by);

-- A user can see an organization they created or where their own membership exists.
drop policy if exists "hauspilot_org_select_member" on public.hauspilot_organizations;
create policy "hauspilot_org_select_member"
on public.hauspilot_organizations
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.hauspilot_memberships m
      where m.organization_id = hauspilot_organizations.id
        and m.user_id = (select auth.uid())
    )
  )
);

-- Organization mutation is limited to creator/owner membership.
drop policy if exists "hauspilot_org_update_owner" on public.hauspilot_organizations;
create policy "hauspilot_org_update_owner"
on public.hauspilot_organizations
for update
to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_organizations.id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  )
)
with check (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_organizations.id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  )
);

-- Membership rows are visible only to the user they describe. This also makes
-- membership subqueries in other policies naturally tenant-scoped.
drop policy if exists "hauspilot_membership_select_self" on public.hauspilot_memberships;
create policy "hauspilot_membership_select_self"
on public.hauspilot_memberships
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

-- The creator may bootstrap exactly their own owner membership. Inviting or
-- changing other members is deliberately server-side/admin work for now.
drop policy if exists "hauspilot_membership_bootstrap_owner" on public.hauspilot_memberships;
create policy "hauspilot_membership_bootstrap_owner"
on public.hauspilot_memberships
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1 from public.hauspilot_organizations o
    where o.id = organization_id
      and o.created_by = (select auth.uid())
  )
);

-- Worker configuration is readable to any member and writable only by the
-- signed-in user's owner/manager membership. Initial autonomy remains capped
-- by the application onboarding contract; production promotion is server-side.
drop policy if exists "hauspilot_worker_select_member" on public.hauspilot_workers;
create policy "hauspilot_worker_select_member"
on public.hauspilot_workers
for select
to authenticated
using (
  exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_workers.organization_id
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists "hauspilot_worker_insert_manager" on public.hauspilot_workers;
create policy "hauspilot_worker_insert_manager"
on public.hauspilot_workers
for insert
to authenticated
with check (
  autonomy_level <= 2
  and exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_workers.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','manager')
  )
);

drop policy if exists "hauspilot_worker_update_manager" on public.hauspilot_workers;
create policy "hauspilot_worker_update_manager"
on public.hauspilot_workers
for update
to authenticated
using (
  exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_workers.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','manager')
  )
)
with check (
  -- Browser-side writes may configure/pause a worker but may not promote it
  -- above Copilot. Earned promotion remains a trusted server operation.
  autonomy_level <= 2
  and exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_workers.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','manager')
  )
);

-- Cases and action traces are customer-readable but provider/runtime-written.
drop policy if exists "hauspilot_case_select_member" on public.hauspilot_cases;
create policy "hauspilot_case_select_member"
on public.hauspilot_cases
for select
to authenticated
using (
  exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_cases.organization_id
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists "hauspilot_action_select_member" on public.hauspilot_actions;
create policy "hauspilot_action_select_member"
on public.hauspilot_actions
for select
to authenticated
using (
  exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_actions.organization_id
      and m.user_id = (select auth.uid())
  )
);

-- Reviewers can submit only reviews under their own authenticated identity and
-- only for an organization they belong to. UPDATE uses both USING + WITH CHECK.
drop policy if exists "hauspilot_review_select_member" on public.hauspilot_reviews;
create policy "hauspilot_review_select_member"
on public.hauspilot_reviews
for select
to authenticated
using (
  exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_reviews.organization_id
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists "hauspilot_review_insert_self" on public.hauspilot_reviews;
create policy "hauspilot_review_insert_self"
on public.hauspilot_reviews
for insert
to authenticated
with check (
  reviewer_user_id = (select auth.uid())
  and exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_reviews.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','manager','reviewer')
  )
);

drop policy if exists "hauspilot_review_update_self" on public.hauspilot_reviews;
create policy "hauspilot_review_update_self"
on public.hauspilot_reviews
for update
to authenticated
using (
  reviewer_user_id = (select auth.uid())
  and exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_reviews.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','manager','reviewer')
  )
)
with check (
  reviewer_user_id = (select auth.uid())
  and exists (
    select 1 from public.hauspilot_memberships m
    where m.organization_id = hauspilot_reviews.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','manager','reviewer')
  )
);
