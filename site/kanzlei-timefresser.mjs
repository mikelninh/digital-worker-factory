export const PROOF_WEEK = Object.freeze({
  name: 'Kanzlei Autopilot Proof Week',
  priceEurNet: 990,
  durationDays: 7,
  automaticSubscription: false,
  customerInputs: ['one_recurring_workflow', '10_to_20_safe_shadow_cases', 'one_accountable_reviewer'],
})

const DEFINITIONS = Object.freeze([
  { id: 'migration/document-readiness', label: 'Unterlagen → bereit für Anwalt', description: 'Neue Dokumente zuordnen, Duplikate erkennen, Änderungen und fehlende Unterlagen vorbereiten.', score: x => x.documentsWeek * .35 + x.missingDocumentFollowupsWeek * 1.5 + x.activeMatters * .05 },
  { id: 'legal/intake-readiness', label: 'Neuanfrage → strukturierte Akte', description: 'Erstkontakt, wiederkehrende Fakten und sichere Unterlagenanforderung strukturieren.', score: x => x.newInquiriesWeek * 1.2 },
  { id: 'legal/client-status', label: 'Statusanfrage → sichere Antwortvorbereitung', description: 'Wiederkehrende Sachstandsfragen aus dem Aktenstatus vorbereiten.', score: x => x.statusRequestsWeek },
  { id: 'legal/research-preparation', label: 'Akte → Research Packet', description: 'Fallfragen, Quellen und offene Tatsachen für die anwaltliche Prüfung vorbereiten.', score: x => x.researchHoursWeek * 4 },
  { id: 'legal/draft-preparation', label: 'Research → erster Entwurf', description: 'Aktenfakten und geprüfte Quellen in eine reviewbare Erstfassung überführen.', score: x => x.draftingHoursWeek * 4 },
  { id: 'legal/deadline-review', label: 'Eingang → Fristkandidat zur Bestätigung', description: 'Datums- und Fristsignale mit Quelle markieren; verbindliche Bestätigung bleibt beim Anwalt.', score: x => x.deadlineCheckingHoursWeek * 5 },
  { id: 'legal/billing-preparation', label: 'Aktivität → Abrechnungsvorbereitung', description: 'Aktivitäten und abrechnungsrelevante Informationen vorbereiten, nicht autonom abrechnen.', score: x => x.billingAdminHoursWeek * 3 },
])

function n(value, max = 10000) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(max, parsed) : 0
}

export function normalizeKanzleiScan(input = {}) {
  return {
    newInquiriesWeek: n(input.newInquiriesWeek),
    activeMatters: n(input.activeMatters),
    documentsWeek: n(input.documentsWeek),
    statusRequestsWeek: n(input.statusRequestsWeek),
    missingDocumentFollowupsWeek: n(input.missingDocumentFollowupsWeek),
    researchHoursWeek: n(input.researchHoursWeek, 168),
    draftingHoursWeek: n(input.draftingHoursWeek, 168),
    deadlineCheckingHoursWeek: n(input.deadlineCheckingHoursWeek, 168),
    billingAdminHoursWeek: n(input.billingAdminHoursWeek, 168),
    staffCount: n(input.staffCount, 1000),
    software: String(input.software ?? '').trim().slice(0, 120),
    biggestBacklog: String(input.biggestBacklog ?? '').trim().slice(0, 500),
  }
}

export function scoreKanzleiWorkload(input = {}) {
  const normalized = normalizeKanzleiScan(input)
  const ranked = DEFINITIONS.map(def => ({
    id: def.id,
    label: def.label,
    description: def.description,
    signal: Number(def.score(normalized).toFixed(2)),
  })).sort((a, b) => b.signal - a.signal)

  const directHours = normalized.researchHoursWeek + normalized.draftingHoursWeek + normalized.deadlineCheckingHoursWeek + normalized.billingAdminHoursWeek
  const volumeSignals = normalized.newInquiriesWeek + normalized.documentsWeek + normalized.statusRequestsWeek + normalized.missingDocumentFollowupsWeek
  const topSignal = ranked[0]?.signal ?? 0
  const opportunity = directHours >= 8 || topSignal >= 20 || volumeSignals >= 80
    ? 'HIGH'
    : directHours >= 3 || topSignal >= 8 || volumeSignals >= 25
      ? 'MEDIUM'
      : 'START_SMALL'
  const qualified = opportunity !== 'START_SMALL'

  return {
    schema: 'kanzlei-timefresser-scan/1',
    opportunity,
    qualification: {
      qualified,
      reason: qualified ? 'repeated_workload_signal_supports_paid_proof_week' : 'start_with_one_small_shadow_workflow',
    },
    rankedWorkflows: ranked.slice(0, 3),
    recommendedFirstWorkflow: ranked[0] ?? null,
    recommendedPilot: `${PROOF_WEEK.name} — €${PROOF_WEEK.priceEurNet} net / ${PROOF_WEEK.durationDays} days`,
    proofWeek: PROOF_WEEK,
    observedInputSummary: {
      directHoursReportedPerWeek: Number(directHours.toFixed(2)),
      repeatedVolumeSignalsPerWeek: volumeSignals,
    },
    truthBoundary: {
      estimatedHoursSaved: null,
      guaranteedRoi: false,
      resultIsWorkloadPrioritizationNotCustomerRoi: true,
    },
  }
}
