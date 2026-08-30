-- Company 01 tokenized, safe-data onboarding path.
-- Production version applied to dedicated Supabase project htffcvdopavknnylbowl.
-- Tokens are stored only as SHA-256 hashes. Raw tokens exist only at issue time / in the prospect link.

create table if not exists private.company01_growth_onboarding_tokens (
  lead_id uuid primary key references public.company01_growth_leads(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  last_used_at timestamptz,
  revoked_at timestamptz
);

grant select, insert, update, delete on table private.company01_growth_onboarding_tokens to service_role;

create or replace function public.company01_issue_onboarding_token(p_lead_id uuid)
returns text
language plpgsql
security invoker
set search_path = public, private, extensions
as $$
declare
  v_token text;
  v_hash text;
begin
  if not exists (
    select 1 from public.company01_growth_leads
     where id = p_lead_id
       and explicit_followup_consent = true
       and status in ('qualified','onboarding')
  ) then
    raise exception 'lead_not_eligible_for_onboarding';
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into private.company01_growth_onboarding_tokens(lead_id, token_hash, created_at, expires_at, last_used_at, revoked_at)
  values (p_lead_id, v_hash, now(), now() + interval '14 days', null, null)
  on conflict (lead_id) do update
    set token_hash = excluded.token_hash,
        created_at = now(),
        expires_at = now() + interval '14 days',
        last_used_at = null,
        revoked_at = null;

  return v_token;
end;
$$;

revoke all on function public.company01_issue_onboarding_token(uuid) from public, anon, authenticated;
grant execute on function public.company01_issue_onboarding_token(uuid) to service_role;

create or replace function public.company01_submit_safe_onboarding(
  p_token_hash text,
  p_workflow_name text,
  p_human_owner text,
  p_systems_touched jsonb,
  p_desired_output text,
  p_safe_examples jsonb,
  p_safety_attestation boolean
) returns uuid
language plpgsql
security invoker
set search_path = public, private, extensions
as $$
declare
  v_lead_id uuid;
  v_examples_count integer;
  v_context_digest text;
begin
  if p_safety_attestation is not true then
    raise exception 'safe_data_attestation_required';
  end if;
  if p_token_hash is null or char_length(trim(p_token_hash)) <> 64 then
    raise exception 'invalid_onboarding_token';
  end if;
  if char_length(trim(coalesce(p_workflow_name,''))) < 3 or char_length(trim(p_workflow_name)) > 160 then
    raise exception 'invalid_workflow_name';
  end if;
  if char_length(trim(coalesce(p_human_owner,''))) < 2 or char_length(trim(p_human_owner)) > 120 then
    raise exception 'invalid_human_owner';
  end if;
  if char_length(trim(coalesce(p_desired_output,''))) < 3 or char_length(trim(p_desired_output)) > 2000 then
    raise exception 'invalid_desired_output';
  end if;
  if jsonb_typeof(coalesce(p_systems_touched,'[]'::jsonb)) <> 'array' then
    raise exception 'systems_touched_must_be_array';
  end if;
  if jsonb_array_length(coalesce(p_systems_touched,'[]'::jsonb)) > 12 then
    raise exception 'too_many_systems';
  end if;
  if jsonb_typeof(coalesce(p_safe_examples,'[]'::jsonb)) <> 'array' then
    raise exception 'safe_examples_must_be_array';
  end if;
  v_examples_count := jsonb_array_length(coalesce(p_safe_examples,'[]'::jsonb));
  if v_examples_count < 1 or v_examples_count > 5 then
    raise exception 'safe_examples_count_must_be_1_to_5';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(p_safe_examples) x
     where char_length(x) > 2500
  ) then
    raise exception 'safe_example_too_large';
  end if;

  select t.lead_id into v_lead_id
    from private.company01_growth_onboarding_tokens t
   where t.token_hash = trim(p_token_hash)
     and t.revoked_at is null
     and t.expires_at > now()
   for update;

  if v_lead_id is null then
    raise exception 'invalid_or_expired_onboarding_token';
  end if;

  update private.company01_growth_onboarding_tokens
     set last_used_at = now()
   where lead_id = v_lead_id;

  insert into public.company01_growth_onboarding(
    lead_id, data_mode, workflow_name, human_owner, systems_touched,
    requested_artifacts, received_artifacts, status, updated_at
  ) values (
    v_lead_id, 'synthetic', left(trim(p_workflow_name),160), left(trim(p_human_owner),120),
    coalesce(p_systems_touched,'[]'::jsonb),
    jsonb_build_array('one_recurring_workflow','1_to_5_safe_examples','desired_output','human_owner','systems_touched'),
    jsonb_build_object(
      'desiredOutput', left(trim(p_desired_output),2000),
      'safeExamples', p_safe_examples,
      'safetyAttestation', true
    ),
    'ready', now()
  )
  on conflict (lead_id) do update
    set data_mode='synthetic',
        workflow_name=excluded.workflow_name,
        human_owner=excluded.human_owner,
        systems_touched=excluded.systems_touched,
        received_artifacts=excluded.received_artifacts,
        status='ready',
        updated_at=now();

  update public.company01_growth_leads
     set status='onboarding', updated_at=now(), next_action='prepare_synthetic_authority_pilot'
   where id=v_lead_id;

  insert into public.company01_growth_events(lead_id,event_type,actor,authority_decision,detail)
  values (
    v_lead_id,'onboarding.safe_inputs_received','prospect','ALLOW',
    jsonb_build_object('dataMode','synthetic','exampleCount',v_examples_count,'workflowName',left(trim(p_workflow_name),160))
  );

  v_context_digest := encode(extensions.digest(
    concat_ws('|',v_lead_id::text,'pilot.synthetic.prepare',left(trim(p_workflow_name),160),v_examples_count::text,'v1'),
    'sha256'
  ),'hex');

  insert into public.company01_growth_action_queue(
    lead_id,action_type,authority_decision,state,idempotency_key,context_digest
  ) values (
    v_lead_id,'pilot.synthetic.prepare','ALLOW','queued',
    concat('lead:',v_lead_id::text,':pilot.synthetic.prepare:v1'),v_context_digest
  ) on conflict (idempotency_key) do nothing;

  return v_lead_id;
end;
$$;

revoke all on function public.company01_submit_safe_onboarding(text,text,text,jsonb,text,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.company01_submit_safe_onboarding(text,text,text,jsonb,text,jsonb,boolean) to service_role;
