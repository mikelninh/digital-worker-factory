const KEYWORDS = Object.freeze({
  repair: ['kaputt', 'defekt', 'reparatur', 'repair', 'leak', 'undicht', 'heizung', 'heating', 'wasser'],
  invoice: ['rechnung', 'invoice', 'betrag', 'zahlung', 'payment', 'gutschrift'],
  tenant_message: ['mieter', 'tenant', 'kündigung', 'complaint', 'beschwerde', 'nachbar', 'noise'],
})

export function validateTriageInput(input) {
  if (!input || typeof input !== 'object') throw new Error('input_required')
  if (typeof input.message !== 'string') throw new Error('message_required')
  const message = input.message.trim()
  if (message.length < 3) throw new Error('message_too_short')
  if (message.length > 5000) throw new Error('message_too_long')
  return { message }
}

export function triageCase(input) {
  const { message } = validateTriageInput(input)
  const text = message.toLowerCase()
  const matches = Object.entries(KEYWORDS)
    .map(([route, keywords]) => ({ route, hits: keywords.filter((word) => text.includes(word)) }))
    .filter((item) => item.hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length)

  const best = matches[0] ?? null
  const ambiguous = Boolean(best && matches[1] && matches[1].hits.length === best.hits.length)
  const route = !best || ambiguous ? 'unknown' : best.route
  const confidence = !best ? 0.35 : ambiguous ? 0.5 : Math.min(0.95, 0.65 + best.hits.length * 0.1)

  return {
    classification: route,
    proposedRoute: route,
    confidence,
    evidence: best ? best.hits.map((keyword) => ({ type: 'keyword', keyword })) : [],
    missingInformation: route === 'unknown' ? ['case_type_or_context'] : [],
    humanApprovalRequired: true,
    externalActionExecuted: false,
    note: 'Paid computation does not grant authority. Review before any consequential action.',
  }
}
