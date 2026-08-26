import assert from "node:assert/strict";
import { cases } from "./cases.mjs";
import { createHandler } from "./lambda.mjs";

const auditRows = [];
const handler = createHandler({
  customerLookup: async (id) => ({ id, plan: "synthetic-business", integrations: ["DATEV", "SFTP"] }),
  incidentLookup: async (intent) => intent === "integration_failure" ? [{ id: "INC-SYN-1", status: "investigating" }] : [],
  audit: async (row) => auditRows.push(row)
});

let intentOk = 0;
let urgencyOk = 0;
let boundaryOk = 0;
let traceOk = 0;

for (const c of cases) {
  const response = await handler({ body: JSON.stringify(c) });
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  if (body.classification.intent === c.expected_intent) intentOk++;
  if (body.classification.urgency === c.expected_urgency) urgencyOk++;
  if ((body.policy.mode === "human_approval") === c.expect_human_approval) boundaryOk++;
  if (body.trace.includes("idempotency.checked") && body.trace.at(-1) === "response.prepared") traceOk++;
}

let duplicateOk = 0;
for (const c of cases) {
  const body = JSON.parse((await handler({ body: JSON.stringify(c) })).body);
  if (body.status === "duplicate_ignored") duplicateOk++;
}

const metrics = {
  cases: cases.length,
  intent_accuracy: `${intentOk}/${cases.length}`,
  urgency_accuracy: `${urgencyOk}/${cases.length}`,
  approval_boundary: `${boundaryOk}/${cases.length}`,
  observable_trace: `${traceOk}/${cases.length}`,
  duplicate_webhook_recovery: `${duplicateOk}/${cases.length}`,
  audit_rows: auditRows.length
};

console.log(JSON.stringify(metrics, null, 2));
assert.equal(intentOk, cases.length);
assert.equal(urgencyOk, cases.length);
assert.equal(boundaryOk, cases.length);
assert.equal(traceOk, cases.length);
assert.equal(duplicateOk, cases.length);
assert.equal(auditRows.length, cases.length);
