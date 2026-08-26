import assert from "node:assert/strict";
import { createHandler } from "./lambda.mjs";
import { createHttpServer } from "./http-server.mjs";

const auditRows = [];
const executedActions = [];
const handler = createHandler({
  customerLookup: async (id) => ({ id, plan: "synthetic-business", integrations: ["DATEV"] }),
  incidentLookup: async (intent) => intent === "integration_failure" ? [{ id: "INC-SYN-HTTP", status: "investigating" }] : [],
  safeAction: async (input) => {
    executedActions.push(input);
    return { status: "executed", action: "internal_document_route" };
  },
  audit: async (row) => auditRows.push(row)
});

const app = createHttpServer({ handler, port: 8787 });
await app.listen();

try {
  const integrationPayload = {
    ticket_id: "T-HTTP-1",
    event_id: "E-HTTP-1",
    customer_id: "C-HTTP-1",
    message: "Urgent: our DATEV connection is down in production."
  };

  const first = await fetch(app.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(integrationPayload)
  });
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.status, "prepared");
  assert.equal(firstBody.classification.intent, "integration_failure");
  assert.equal(firstBody.classification.urgency, "high");
  assert.equal(firstBody.policy.mode, "draft_only");
  assert.equal(firstBody.execution, null);

  const duplicate = await fetch(app.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(integrationPayload)
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
  assert.equal(accessBody.execution, null);

  const routing = await fetch(app.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ticket_id: "T-HTTP-3",
      event_id: "E-HTTP-3",
      message: "An incoming document was routed to the wrong destination."
    })
  });
  const routingBody = await routing.json();
  assert.equal(routing.status, 200);
  assert.equal(routingBody.classification.intent, "document_routing");
  assert.equal(routingBody.policy.mode, "auto_execute");
  assert.equal(routingBody.status, "executed");
  assert.equal(routingBody.execution?.status, "executed");
  assert.ok(routingBody.trace.includes("safe_action.executed"));

  const invalid = await fetch(app.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ticket_id: "T-BAD" })
  });
  assert.equal(invalid.status, 400);

  assert.equal(auditRows.length, 3);
  assert.equal(executedActions.length, 1);

  console.log(JSON.stringify({
    http_endpoint: "PASS",
    integration_request: "draft_only",
    duplicate_replay: "duplicate_ignored",
    consequential_action: "human_approval",
    safe_internal_routing: "executed",
    invalid_payload: "400",
    audit_rows: auditRows.length,
    safe_actions: executedActions.length
  }, null, 2));
} finally {
  await app.close();
}
