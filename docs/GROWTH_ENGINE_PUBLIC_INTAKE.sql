-- Company 01 public lead-intake boundary.
-- Production migration applied to dedicated project htffcvdopavknnylbowl.

create schema if not exists private;

create table if not exists private.company01_growth_rate_limits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ip_hash text not null check (char_length(ip_hash) between 16 and 128),
  source text not null default 'authority_scorecard'
);

create index if not exists company01_growth_rate_limits_ip_created_idx
  on private.company01_growth_rate_limits(ip_hash, created_at desc);

create index if not exists company01_growth_action_queue_lead_idx
  on public.company01_growth_action_queue(lead_id);
create index if not exists company01_growth_approvals_lead_idx
  on public.company01_growth_approvals(lead_id);

grant usage on schema private to service_role;
grant select, insert, delete on table private.company01_growth_rate_limits to service_role;
grant usage, select on all sequences in schema private to service_role;

create or replace function public.company01_ingest_inbound_lead(
  p_ip_hash text,
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
set search_path = public, private
as $$
declare
  v_recent integer;
  v_lead_id uuid;
begin
  if p_ip_hash is null or char_length(trim(p_ip_hash)) < 16 or char_length(trim(p_ip_hash)) > 128 then
    raise exception 'invalid_ip_hash';
  end if;

  delete from private.company01_growth_rate_limits
   where created_at < now() - interval '1 day';

  select count(*)::int into v_recent
    from private.company01_growth_rate_limits
   where ip_hash = trim(p_ip_hash)
     and created_at >= now() - interval '10 minutes';

  if v_recent >= 10 then
    raise sqlstate 'PGRST' using
      message = json_build_object('code','rate_limited','message','Too many submissions. Try again later.')::text,
      detail = json_build_object('status',429,'status_text','Too Many Requests')::text;
  end if;

  insert into private.company01_growth_rate_limits(ip_hash, source)
  values (trim(p_ip_hash), coalesce(nullif(left(trim(p_source),80),''),'authority_scorecard'));

  select public.company01_create_inbound_lead(
    p_organisation,p_email,p_source,p_sector,p_agent_stage,
    p_readiness_score,p_authority_risk_score,p_consequence_signals,
    p_urgency,p_recommended_pilot,p_answers,p_result
  ) into v_lead_id;

  return v_lead_id;
end;
$$;

revoke all on function public.company01_ingest_inbound_lead(
  text,text,text,text,text,text,integer,integer,integer,text,text,jsonb,jsonb
) from public, anon, authenticated;
grant execute on function public.company01_ingest_inbound_lead(
  text,text,text,text,text,text,integer,integer,integer,text,text,jsonb,jsonb
) to service_role;
