import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const homepage = read('site/index.html')
const scorecard = read('site/agent-authority-scorecard.html')
const docs = read('docs/GROWTH_ENGINE.md')
const datastore = read('docs/GROWTH_ENGINE_DATASTORE.sql')
const intake = read('docs/GROWTH_ENGINE_PUBLIC_INTAKE.sql')
const autopilot = read('docs/GROWTH_ENGINE_AUTOPILOT.sql')
const edge = read('supabase/functions/company01-lead-intake/index.ts')
const proxy = read('site/api/leads.js')
const vercel = JSON.parse(read('site/vercel.json'))

test('Company 01 root is a conversion homepage, not the legacy Factory shell', () => {
  assert.match(homepage, /Company 01 — Authority infrastructure for autonomous systems/)
  assert.match(homepage, /Give AI useful work/)
  assert.match(homepage, /\/scorecard/)
  assert.match(homepage, /\/pilot/)
  assert.match(homepage, /What is not yet proven/)
  assert.match(homepage, /Real customer revenue/)
  assert.doesNotMatch(homepage, /guaranteed ROI/i)
})

test('legacy Digital Worker Factory remains available as a separate route', () => {
  const routes = new Map(vercel.rewrites.map(({ source, destination }) => [source, destination]))
  assert.equal(routes.get('/factory'), '/factory.html')
  assert.equal(routes.get('/scorecard'), '/agent-authority-scorecard.html')
  assert.equal(routes.get('/pilot'), '/trusted-agent-pilot.html')
  assert.equal(routes.get('/pilot/legal'), '/pilot-legal.html')
  assert.equal(routes.get('/pilot/government'), '/pilot-government.html')
  assert.equal(routes.get('/pilot/healthcare'), '/pilot-healthcare.html')
})

test('scorecard is useful before contact capture and requires explicit consent to submit', () => {
  assert.match(scorecard, /How much power/)
  assert.match(scorecard, /Nothing is sent anywhere just to calculate it/)
  assert.match(scorecard, /explicitFollowupConsent:consent/)
  assert.match(docs, /explicit follow-up consent/)
})

test('public intake has a server-only authority path and abuse boundary', () => {
  assert.match(datastore, /security invoker/i)
  assert.match(datastore, /revoke all on function public\.company01_create_inbound_lead/i)
  assert.match(intake, /company01_ingest_inbound_lead/)
  assert.match(intake, /10 minutes/)
  assert.match(edge, /SUPABASE_SECRET_KEYS/)
  assert.match(edge, /company01_ingest_inbound_lead/)
  assert.match(edge, /x-forwarded-for/)
  assert.match(proxy, /company01-lead-intake/)
})

test('qualification autopilot is concurrency-safe and only queues consented acknowledgement', () => {
  assert.match(autopilot, /company01-growth-autopilot/)
  assert.match(autopilot, /for update skip locked/i)
  assert.match(autopilot, /growth\.inbound\.acknowledge/)
  assert.match(autopilot, /status = 'nurture'/)
  assert.match(autopilot, /data_mode, requested_artifacts, status/)
})

test('site applies baseline security headers', () => {
  const all = vercel.headers.find((entry) => entry.source === '/(.*)')
  assert.ok(all)
  const headers = new Map(all.headers.map(({ key, value }) => [key, value]))
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(headers.get('X-Frame-Options'), 'DENY')
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
})
