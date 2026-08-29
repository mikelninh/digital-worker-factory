-- Company 01 privacy-safe public growth ledger.
-- Production version applied to dedicated Supabase project htffcvdopavknnylbowl.
-- Returns aggregate counts only: no organisation names, emails, scorecard answers or customer artifacts.

create or replace function public.company01_public_growth_metrics()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'schema', 'company01-public-ledger/0.1',
    'generatedAt', now(),
    'leads', jsonb_build_object(
      'total', (select count(*) from public.company01_growth_leads),
      'new', (select count(*) from public.company01_growth_leads where status = 'new'),
      'qualified', (select count(*) from public.company01_growth_leads where status = 'qualified'),
      'nurture', (select count(*) from public.company01_growth_leads where status = 'nurture'),
      'onboarding', (select count(*) from public.company01_growth_leads where status = 'onboarding'),
      'pilot', (select count(*) from public.company01_growth_leads where status = 'pilot'),
      'won', (select count(*) from public.company01_growth_leads where status = 'won'),
      'lost', (select count(*) from public.company01_growth_leads where status = 'lost')
    ),
    'onboarding', jsonb_build_object(
      'total', (select count(*) from public.company01_growth_onboarding),
      'requested', (select count(*) from public.company01_growth_onboarding where status = 'requested'),
      'ready', (select count(*) from public.company01_growth_onboarding where status = 'ready'),
      'shadow', (select count(*) from public.company01_growth_onboarding where status = 'shadow'),
      'pilot', (select count(*) from public.company01_growth_onboarding where status = 'pilot'),
      'completed', (select count(*) from public.company01_growth_onboarding where status = 'completed')
    ),
    'actions', jsonb_build_object(
      'total', (select count(*) from public.company01_growth_action_queue),
      'queued', (select count(*) from public.company01_growth_action_queue where state = 'queued'),
      'completed', (select count(*) from public.company01_growth_action_queue where state = 'completed'),
      'failed', (select count(*) from public.company01_growth_action_queue where state = 'failed'),
      'reconciliationRequired', (select count(*) from public.company01_growth_action_queue where state = 'reconciliation_required'),
      'allow', (select count(*) from public.company01_growth_action_queue where authority_decision = 'ALLOW'),
      'approval', (select count(*) from public.company01_growth_action_queue where authority_decision = 'APPROVAL'),
      'block', (select count(*) from public.company01_growth_action_queue where authority_decision = 'BLOCK')
    ),
    'authority', jsonb_build_object(
      'explicitConsentLeads', (select count(*) from public.company01_growth_leads where explicit_followup_consent = true),
      'missingConsentLeads', (select count(*) from public.company01_growth_leads where explicit_followup_consent = false),
      'contractCommitmentExecutions', 0
    )
  );
$$;

revoke all on function public.company01_public_growth_metrics() from public, anon, authenticated;
grant execute on function public.company01_public_growth_metrics() to service_role;
