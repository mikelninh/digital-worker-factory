-- Company 01 growth extension: Kanzlei Timefresser Scan → Proof Week.
-- Keeps workload qualification semantically separate from Authority Scorecard metrics.

create or replace function public.company01_process_new_growth_leads(p_batch_size integer default 25)
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  r public.company01_growth_leads%rowtype;
  v_qualified boolean;
  v_is_kanzlei_scan boolean;
  v_scan_qualified boolean;
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
    v_is_kanzlei_scan := r.source = 'kanzlei_timefresser';
    v_scan_qualified := lower(coalesce(r.result #>> '{qualification,qualified}', 'false')) = 'true';

    if v_is_kanzlei_scan then
      v_qualified := v_scan_qualified;
    else
      v_qualified := coalesce(r.consequence_signals, 0) >= 1
        and (coalesce(r.readiness_score, 0) < 90 or r.agent_stage = 'production');
    end if;

    if v_qualified then
      v_qualified_count := v_qualified_count + 1;
      update public.company01_growth_leads
         set status = 'qualified',
             updated_at = now(),
             next_action = case
               when v_is_kanzlei_scan then 'send_consented_ack_and_collect_proof_week_inputs'
               else 'send_consented_ack_and_collect_safe_pilot_inputs'
             end
       where id = r.id;

      insert into public.company01_growth_onboarding (
        lead_id, data_mode, requested_artifacts, status
      ) values (
        r.id,
        'synthetic',
        case
          when v_is_kanzlei_scan then jsonb_build_array(
            'one_recurring_workflow',
            '10_to_20_safe_shadow_cases',
            'one_accountable_reviewer'
          )
          else jsonb_build_array(
            'one_recurring_workflow',
            '3_to_5_safe_examples',
            'desired_output',
            'human_owner',
            'systems_touched'
          )
        end,
        'requested'
      )
      on conflict (lead_id) do nothing;

      if v_is_kanzlei_scan then
        insert into public.company01_growth_events (lead_id,event_type,actor,authority_decision,detail)
        values
          (r.id,'lead.qualified','growth_agent','ALLOW',jsonb_build_object('source',r.source,'urgency',r.urgency,'recommendedPilot',r.recommended_pilot)),
          (r.id,'kanzlei_scan.prioritized','growth_agent','ALLOW',jsonb_build_object(
            'opportunity',r.result->>'opportunity',
            'recommendedFirstWorkflow',r.result#>'{recommendedFirstWorkflow}',
            'truthBoundary',r.result#>'{truthBoundary}'
          )),
          (r.id,'pilot.recommended','growth_agent','ALLOW',jsonb_build_object('pilot',r.recommended_pilot)),
          (r.id,'proof_week_onboarding.requested','growth_agent','ALLOW',jsonb_build_object('dataMode','synthetic','priceEurNet',990,'durationDays',7,'automaticSubscription',false));
      else
        insert into public.company01_growth_events (lead_id,event_type,actor,authority_decision,detail)
        values
          (r.id,'lead.qualified','growth_agent','ALLOW',jsonb_build_object('urgency',r.urgency,'recommendedPilot',r.recommended_pilot)),
          (r.id,'authority_report.prepared','growth_agent','ALLOW',jsonb_build_object('readiness',r.readiness_score,'risk',r.authority_risk_score)),
          (r.id,'pilot.recommended','growth_agent','ALLOW',jsonb_build_object('pilot',r.recommended_pilot)),
          (r.id,'sandbox_onboarding.requested','growth_agent','ALLOW',jsonb_build_object('dataMode','synthetic'));
      end if;

      v_context_digest := encode(extensions.digest(
        concat_ws('|', r.id::text, 'growth.inbound.acknowledge', r.email, r.recommended_pilot, r.source, 'v2'),
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
        concat('lead:', r.id::text, ':growth.inbound.acknowledge:v2'),
        v_context_digest
      )
      on conflict (idempotency_key) do nothing;
    else
      v_nurture_count := v_nurture_count + 1;
      update public.company01_growth_leads
         set status = 'nurture',
             updated_at = now(),
             next_action = case
               when v_is_kanzlei_scan then 'offer_small_shadow_workflow'
               else 'offer_read_only_authority_guidance'
             end
       where id = r.id;

      insert into public.company01_growth_events (lead_id,event_type,actor,authority_decision,detail)
      values (
        r.id,
        'lead.nurture','growth_agent','ALLOW',
        case
          when v_is_kanzlei_scan then jsonb_build_object('reason','workload_signal_below_paid_proof_week_threshold','source',r.source)
          else jsonb_build_object('reason','low_consequence_or_mature_controls','readiness',r.readiness_score)
        end
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
