import { GROWTH_AGENT_ACTIONS } from './growth-agent.mjs'

function requireAllowed(action) {
  if (!action || action?.authority?.decision !== 'ALLOW') {
    const error = new Error('growth_action_not_authorized')
    error.code = 'growth_action_not_authorized'
    throw error
  }
}

function validEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160
}

export function createInboundEmailExecutor({ sendEmail }) {
  if (typeof sendEmail !== 'function') throw new Error('sendEmail_required')

  return async function executeInboundEmail(action) {
    requireAllowed(action)
    if (action.actionType !== GROWTH_AGENT_ACTIONS.INBOUND_ACK) {
      throw new Error('unsupported_growth_email_action')
    }

    const recipient = action?.payload?.recipient
    if (!validEmail(recipient)) throw new Error('valid_recipient_required')

    return sendEmail({
      to: recipient,
      subject: action?.payload?.subject || 'Your Agent Authority Map',
      body: action?.payload?.body || 'Thanks for requesting follow-up. We will use the authority map you generated to prepare the smallest safe pilot.',
      authorityTrace: {
        leadId: action.leadId,
        contextDigest: action.contextDigest,
        idempotencyKey: action.idempotencyKey,
      },
    })
  }
}

export function createMeetingExecutor({ createEvent }) {
  if (typeof createEvent !== 'function') throw new Error('createEvent_required')

  return async function executeMeeting(action) {
    requireAllowed(action)
    if (action.actionType !== GROWTH_AGENT_ACTIONS.MEETING_CONFIRM) {
      throw new Error('unsupported_growth_calendar_action')
    }

    const { startTime, endTime, attendeeEmail, title = 'Trusted Agent Pilot' } = action.payload || {}
    if (!startTime || !endTime || !validEmail(attendeeEmail)) throw new Error('meeting_payload_incomplete')

    return createEvent({
      title,
      startTime,
      endTime,
      attendees: [attendeeEmail],
      authorityTrace: {
        leadId: action.leadId,
        contextDigest: action.contextDigest,
        idempotencyKey: action.idempotencyKey,
      },
    })
  }
}

export async function executeOnlyAllowed({ action, executor }) {
  requireAllowed(action)
  if (typeof executor !== 'function') throw new Error('executor_required')
  return executor(action)
}
