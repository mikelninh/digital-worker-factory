export class MemoryUsageBudgetStore {
  constructor({ windowMs = 60_000, defaultLimit = 60 } = {}) {
    if (!Number.isInteger(windowMs) || windowMs < 1_000) throw new Error('usage_window_invalid')
    if (!Number.isInteger(defaultLimit) || defaultLimit < 1) throw new Error('usage_limit_invalid')
    this.windowMs = windowMs
    this.defaultLimit = defaultLimit
    this.buckets = new Map()
  }

  consume({ subject, capabilityId, units = 1, limit = this.defaultLimit, now = Date.now() }) {
    if (!subject || !capabilityId) throw new Error('usage_subject_and_capability_required')
    if (!Number.isInteger(units) || units < 1) throw new Error('usage_units_invalid')
    const key = `${subject}:${capabilityId}`
    let bucket = this.buckets.get(key)
    if (!bucket || bucket.resetAt <= now) bucket = { used: 0, resetAt: now + this.windowMs }
    if (bucket.used + units > limit) return { allowed: false, used: bucket.used, limit, resetAt: bucket.resetAt }
    bucket.used += units
    this.buckets.set(key, bucket)
    return { allowed: true, used: bucket.used, limit, resetAt: bucket.resetAt }
  }
}

export function usageBudgetMiddleware({
  store,
  capabilityId,
  subjectResolver,
  limit = 60,
} = {}) {
  if (!store || typeof store.consume !== 'function') throw new Error('usage_store_required')
  if (!capabilityId) throw new Error('usage_capability_required')
  if (typeof subjectResolver !== 'function') throw new Error('usage_subject_resolver_required')

  return (req, res, next) => {
    try {
      const subject = subjectResolver(req, res)
      const budget = store.consume({ subject, capabilityId, limit })
      res.set('x-ratelimit-limit', String(budget.limit))
      res.set('x-ratelimit-remaining', String(Math.max(0, budget.limit - budget.used)))
      res.set('x-ratelimit-reset', String(Math.ceil(budget.resetAt / 1000)))
      if (!budget.allowed) {
        return res.status(429).json({ error: 'usage_budget_exceeded', requestId: res.locals.requestId ?? null })
      }
      res.locals.usageBudget = budget
      return next()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : String(error), requestId: res.locals.requestId ?? null })
    }
  }
}
