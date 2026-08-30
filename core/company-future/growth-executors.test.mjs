import assert from 'node:assert/strict'
import test from 'node:test'
import { GROWTH_AGENT_ACTIONS } from './growth-agent.mjs'
import { createInboundEmailExecutor, createMeetingExecutor } from './growth-executors.mjs'

function action(overrides = {}) {
  return {
    leadId: 'lead-1',
    actionType: GROWTH_AGENT_ACTIONS.INBOUND_ACK,
    authority: { decision: 'ALLOW', reason: 'inbound_followup_requested' },
    contextDigest: 'digest',
    idempotencyKey: 'idem',
    payload: { recipient: 'prospect@example.com' },
    ...overrides,
  }
}

test('explicitly allowed inbound acknowledgement reaches email provider once', async () => {
  const calls = []
  const execute = createInboundEmailExecutor({ sendEmail: async (input) => { calls.push(input); return { id: 'mail-1' } } })
  const result = await execute(action())
  assert.equal(result.id, 'mail-1')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].to, 'prospect@example.com')
})

test('approval-gated unsolicited email never reaches provider', async () => {
  const calls = []
  const execute = createInboundEmailExecutor({ sendEmail: async (input) => { calls.push(input) } })
  const gated = action({
    actionType: GROWTH_AGENT_ACTIONS.OUTBOUND_SEND,
    authority: { decision: 'APPROVAL', reason: 'growth_action_requires_human_approval' },
  })
  await assert.rejects(() => execute(gated), /growth_action_not_authorized/)
  assert.equal(calls.length, 0)
})

test('prospect-selected available meeting reaches calendar provider once', async () => {
  const calls = []
  const execute = createMeetingExecutor({ createEvent: async (input) => { calls.push(input); return { id: 'event-1' } } })
  const result = await execute(action({
    actionType: GROWTH_AGENT_ACTIONS.MEETING_CONFIRM,
    authority: { decision: 'ALLOW', reason: 'prospect_selected_available_slot' },
    payload: {
      attendeeEmail: 'prospect@example.com',
      startTime: '2026-09-02T10:00:00+02:00',
      endTime: '2026-09-02T10:30:00+02:00',
      title: 'Trusted Agent Pilot',
    },
  }))
  assert.equal(result.id, 'event-1')
  assert.equal(calls.length, 1)
})

test('unavailable-slot approval state prevents calendar provider call', async () => {
  const calls = []
  const execute = createMeetingExecutor({ createEvent: async (input) => { calls.push(input) } })
  await assert.rejects(() => execute(action({
    actionType: GROWTH_AGENT_ACTIONS.MEETING_CONFIRM,
    authority: { decision: 'APPROVAL', reason: 'meeting_not_explicitly_selected_or_available' },
    payload: { attendeeEmail: 'prospect@example.com', startTime: 'x', endTime: 'y' },
  })), /growth_action_not_authorized/)
  assert.equal(calls.length, 0)
})
