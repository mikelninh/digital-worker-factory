import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const page = read('site/kanzlei-timefresser.html')
const routes = read('site/vercel.json')
const edge = read('supabase/functions/company01-lead-intake/index.ts')
const sql = read('docs/GROWTH_ENGINE_KANZLEI_SCAN.sql')
const legalPilot = read('site/pilot-legal.html')
const funnel = read('docs/KANZLEI_REVENUE_FUNNEL.md')

test('Kanzlei scan gives value before optional contact and points to fixed Proof Week', () => {
  assert.match(page, /Ergebnis sofort/)
  assert.match(page, /Optional\. Ihr Ergebnis bleibt auch ohne Kontaktformular sichtbar/i)
  assert.match(page, /€990 netto · 7 Tage/)
  assert.match(page, /Keine automatische Verlängerung/i)
  assert.match(page, /source:'kanzlei_timefresser'/)
  assert.match(page, /explicitFollowupConsent/)
})

test('public routing exposes Kanzlei scan and legal pilot points back to it', () => {
  assert.match(routes, /"source": "\/kanzlei"/)
  assert.match(routes, /kanzlei-timefresser\.html/)
  assert.match(legalPilot, /href="\/kanzlei"/)
  assert.match(legalPilot, /€990 netto/)
  assert.match(legalPilot, /keine automatische Verlängerung/i)
})

test('workload scan never masquerades as an Authority Scorecard', () => {
  assert.match(edge, /isAuthorityScorecard/)
  assert.match(edge, /p_readiness_score: isAuthorityScorecard/)
  assert.match(edge, /p_authority_risk_score: isAuthorityScorecard/)
  assert.match(edge, /p_consequence_signals: isAuthorityScorecard/)
  assert.match(edge, /body\?\.result\?\.recommendedPilot/)
})

test('growth autopilot has source-specific Kanzlei qualification and Proof Week artifacts', () => {
  assert.match(sql, /r\.source = 'kanzlei_timefresser'/)
  assert.match(sql, /\{qualification,qualified\}/)
  assert.match(sql, /10_to_20_safe_shadow_cases/)
  assert.match(sql, /one_accountable_reviewer/)
  assert.match(sql, /automaticSubscription',false/)
  assert.match(sql, /kanzlei_scan\.prioritized/)
})

test('revenue funnel explicitly rejects fake ROI and automatic continuation', () => {
  assert.match(funnel, /does not estimate hours saved/i)
  assert.match(funnel, /no automatic subscription/i)
  assert.match(funnel, /explicit commercial acceptance/i)
})
