import assert from "node:assert/strict";
import { createHandler } from "./lambda.mjs";
import { createHttpServer } from "./http-server.mjs";

const auditRows = [];
const handler = createHandler({
  customerLookup: async (id) => ({ id, plan: "synthetic-business", integrations: ["DATEV"] }),
  incidentLookup: async (intent) => intent === "integration_failure" ? [{ id: "INC-SYN-HTTP", status: "investigating" }] : [],
  audit: async (row) => auditRows.push(row)
});

const app = createHttpServer({ handler, port: 8787 });
await app.listen();

try {
  const payload = {
    ticket_id: "T-HTTP-1",
    event_id: "E-HTTP-1",
    customer_id: "C-HTTP-1",
    message: "Urgent: our DATEV connection is down in production."
  };

  const first = await fetch(app.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.status, "prepared");
  assert.equal(firstBody.classification.intent, "integration_failure");
  assert.equal(firstBody.classification.urgency, "high");
  assert.equal(firstBody.policy.mode, "draft_only");
  assert.equal(firstBody.trace.at(-1), "response.prepared");

  const duplicate = await fetch(app.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const duplicateBody = await duplicate.json();
  assert.equal(duplicateBody.status, "duplicate_ignored");

  const access = await fetch(app.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ticket_id: "T-HTTP-2",
      event_id: "E-HTTP-2",
      message: "Please change account settings for the new colleague.",
      requested_action: "change account settings"
    })
  });
  const accessBody = await access.json();
  assert.equal(accessBody.policy.mode, "human_approval");

  const invalid = await fetch(app.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ticket_id: "T-BAD" })
  });
  assert.equal(invalid.status, 400);

  assert.equal(auditRows.length, 2);

  console.log(JSON.stringify({
    http_endpoint: "PASS",
    first_request: "prepared",
    duplicate_replay: "duplicate_ignored",
    consequential_action: "human_approval",
    invalid_payload: "400",
    audit_rows: auditRows.length
  }, null, 2));
} finally {
  await app.close();
}
