-- Company 01 deterministic inbound qualification + safe onboarding autopilot.
-- Production version applied to dedicated Supabase project htffcvdopavknnylbowl.

create extension if not exists pg_cron;

alter table public.company01_growth_leads
  drop constraint if exists company01_growth_leads_status_check;
alter table public.company01_growth_leads
  add constraint company01_growth_leads_status_check
  check (status in ('new','qualified','nurture','contacted','onboarding','pilot','won','lost','do_not_contact'));

create or replace function public.company01_process_new_growth_leads(p_batch_size integer default 25)
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  r public.company01_growth_leads%rowtype;
  v_qualified boolean;
  v_context_digest text;
  v_processed integer := 0;
  v_qualified_count integer := 0;
  v_nurture_count integer := 0;
begin
  if p_batch_size < 1 or p_batch_size > 100 then
    raise exception 'invalid_batch_size';
  end if;

  for r in
    select *
      from public.company01_growth_leads
     where status = 'new'
       and explicit_followup_consent = true
     order by created_at asc
     for update skip locked
     limit p_batch_size
  loop
    v_processed := v_processed + 1;
    v_qualified := coalesce(r.consequence_signals, 0) >= 1
      and (coalesce(r.readiness_score, 0) < 90 or r.agent_stage = 'production');

    if v_qualified then
      v_qualified_count := v_qualified_count + 1;
      update public.company01_growth_leads
         set status = 'qualified',
             updated_at = now(),
             next_action = 'send_consented_ack_and_collect_safe_pilot_inputs'
       where id = r.id;

      insert into public.company01_growth_onboarding (
        lead_id, data_mode, requested_artifacts, status
      ) values (
        r.id,
        'synthetic',
        jsonb_build_array(
          'one_recurring_workflow',
          '3_to_5_safe_examples',
          'desired_output',
          'human_owner',
          'systems_touched'
        ),
        'requested'
      )
      on conflict (lead_id) do nothing;

      insert into public.company01_growth_events (lead_id,event_type,actor,authority_decision,detail)
      values
        (r.id,'lead.qualified','growth_agent','ALLOW',jsonb_build_object('urgency',r.urgency,'recommendedPilot',r.recommended_pilot)),
        (r.id,'authority_report.prepared','growth_agent','ALLOW',jsonb_build_object('readiness',r.readiness_score,'risk',r.authority_risk_score)),
        (r.id,'pilot.recommended','growth_agent','ALLOW',jsonb_build_object('pilot',r.recommended_pilot)),
        (r.id,'sandbox_onboarding.requested','growth_agent','ALLOW',jsonb_build_object('dataMode','synthetic'));

      v_context_digest := encode(extensions.digest(
        concat_ws('|', r.id::text, 'growth.inbound.acknowledge', r.email, r.recommended_pilot, 'v1'),
        'sha256'
      ), 'hex');

      insert into public.company01_growth_action_queue (
        lead_id, action_type, authority_decision, state,
        idempotency_key, context_digest
      ) values (
        r.id,
        'growth.inbound.acknowledge',
        'ALLOW',
        'queued',
        concat('lead:', r.id::text, ':growth.inbound.acknowledge:v1'),
        v_context_digest
      )
      on conflict (idempotency_key) do nothing;
    else
      v_nurture_count := v_nurture_count + 1;
      update public.company01_growth_leads
         set status = 'nurture',
             updated_at = now(),
             next_action = 'offer_read_only_authority_guidance'
       where id = r.id;

      insert into public.company01_growth_events (lead_id,event_type,actor,authority_decision,detail)
      values (
        r.id,
        'lead.nurture','growth_agent','ALLOW',
        jsonb_build_object('reason','low_consequence_or_mature_controls','readiness',r.readiness_score)
      );
    end if;
  end loop;

  return jsonb_build_object(
    'processed', v_processed,
    'qualified', v_qualified_count,
    'nurture', v_nurture_count
  );
end;
$$;

revoke all on function public.company01_process_new_growth_leads(integer) from public, anon, authenticated;
grant execute on function public.company01_process_new_growth_leads(integer) to service_role;

-- Replace the recurring job definition idempotently.
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'company01-growth-autopilot' limit 1;
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end $$;

select cron.schedule(
  'company01-growth-autopilot',
  '* * * * *',
  $$select public.company01_process_new_growth_leads(25);$$
);
