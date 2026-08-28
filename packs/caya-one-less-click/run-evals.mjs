import assert from "node:assert/strict";
import { cases } from "./cases.mjs";
import { createHandler } from "./lambda.mjs";

const auditRows = [];
const executedActions = [];
const handler = createHandler({
  customerLookup: async (id) => ({ id, plan: "synthetic-business", integrations: ["DATEV", "SFTP"] }),
  incidentLookup: async (intent) => intent === "integration_failure" ? [{ id: "INC-SYN-1", status: "investigating" }] : [],
  safeAction: async (input) => {
    executedActions.push(input);
    return { status: "executed", action: "internal_document_route" };
  },
  audit: async (row) => auditRows.push(row)
});

let intentOk = 0;
let urgencyOk = 0;
let policyOk = 0;
let boundaryOk = 0;
let traceOk = 0;
let safeAutoOk = 0;
const autoExpected = cases.filter((c) => c.expected_policy_mode === "auto_execute").length;

for (const c of cases) {
  const response = await handler({ body: JSON.stringify(c) });
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  if (body.classification.intent === c.expected_intent) intentOk++;
  if (body.classification.urgency === c.expected_urgency) urgencyOk++;
  if (body.policy.mode === c.expected_policy_mode) policyOk++;
  if ((body.policy.mode === "human_approval") === c.expect_human_approval) boundaryOk++;
  if (body.trace.includes("idempotency.checked") && body.trace.includes("response.prepared")) traceOk++;
  if (
    c.expected_policy_mode === "auto_execute" &&
    body.status === "executed" &&
    body.execution?.status === "executed" &&
    body.trace.includes("safe_action.executed")
  ) safeAutoOk++;
}

let duplicateOk = 0;
for (const c of cases) {
  const body = JSON.parse((await handler({ body: JSON.stringify(c) })).body);
  if (body.status === "duplicate_ignored") duplicateOk++;
}

// A failed first attempt must NOT poison the idempotency key.
let lookupAttempts = 0;
const retryAudit = [];
const retryHandler = createHandler({
  customerLookup: async () => {
    lookupAttempts++;
    if (lookupAttempts === 1) throw new Error("synthetic transient lookup failure");
    return { plan: "synthetic-retry" };
  },
  audit: async (row) => retryAudit.push(row)
});
const retryPayload = {
  ticket_id: "T-RETRY-1",
  event_id: "E-RETRY-1",
  message: "DATEV connection failed and documents are not being forwarded."
};
await assert.rejects(
  retryHandler({ body: JSON.stringify(retryPayload) }),
  /synthetic transient lookup failure/
);
const retryResponse = await retryHandler({ body: JSON.stringify(retryPayload) });
const retryBody = JSON.parse(retryResponse.body);
assert.equal(retryResponse.statusCode, 200);
assert.equal(retryBody.status, "prepared");
assert.equal(lookupAttempts, 2);
assert.equal(retryAudit.length, 1);

// Concurrent copies of the same event must not both execute. While the first
// request is still running, the second receives duplicate_in_flight. Once the
// first completes, later replays are duplicate_ignored.
let releaseLookup;
let lookupStarted;
const lookupStartedPromise = new Promise((resolve) => { lookupStarted = resolve; });
const lookupReleasePromise = new Promise((resolve) => { releaseLookup = resolve; });
const concurrentAudit = [];
const concurrentHandler = createHandler({
  customerLookup: async () => {
    lookupStarted();
    await lookupReleasePromise;
    return { plan: "synthetic-concurrency" };
  },
  audit: async (row) => concurrentAudit.push(row)
});
const concurrentPayload = {
  ticket_id: "T-CONCURRENT-1",
  event_id: "E-CONCURRENT-1",
  message: "DATEV connection failed and documents are not being forwarded."
};
const firstConcurrent = concurrentHandler({ body: JSON.stringify(concurrentPayload) });
await lookupStartedPromise;
const inFlightResponse = await concurrentHandler({ body: JSON.stringify(concurrentPayload) });
const inFlightBody = JSON.parse(inFlightResponse.body);
assert.equal(inFlightResponse.statusCode, 202);
assert.equal(inFlightBody.status, "duplicate_in_flight");
releaseLookup();
const completedConcurrent = await firstConcurrent;
assert.equal(completedConcurrent.statusCode, 200);
const completedReplay = await concurrentHandler({ body: JSON.stringify(concurrentPayload) });
assert.equal(JSON.parse(completedReplay.body).status, "duplicate_ignored");
assert.equal(concurrentAudit.length, 1);

const metrics = {
  cases: cases.length,
  intent_accuracy: `${intentOk}/${cases.length}`,
  urgency_accuracy: `${urgencyOk}/${cases.length}`,
  policy_mode: `${policyOk}/${cases.length}`,
  approval_boundary: `${boundaryOk}/${cases.length}`,
  observable_trace: `${traceOk}/${cases.length}`,
  safe_auto_execution: `${safeAutoOk}/${autoExpected}`,
  duplicate_webhook_recovery: `${duplicateOk}/${cases.length}`,
  transient_failure_retry: "PASS",
  concurrent_duplicate_gate: "PASS",
  audit_rows: auditRows.length,
  safe_actions: executedActions.length
};

console.log(JSON.stringify(metrics, null, 2));
assert.equal(intentOk, cases.length);
assert.equal(urgencyOk, cases.length);
assert.equal(policyOk, cases.length);
assert.equal(boundaryOk, cases.length);
assert.equal(traceOk, cases.length);
assert.equal(safeAutoOk, autoExpected);
assert.equal(duplicateOk, cases.length);
assert.equal(auditRows.length, cases.length);
assert.equal(executedActions.length, autoExpected);
