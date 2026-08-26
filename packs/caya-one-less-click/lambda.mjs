import crypto from "node:crypto";
import { classifyRequest, policyFor } from "./routing.mjs";

function parseEvent(event) {
  const raw = event?.body ?? event;
  const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!payload || typeof payload !== "object") throw new Error("Invalid webhook payload");
  if (!payload.ticket_id || !payload.message) throw new Error("ticket_id and message are required");
  return payload;
}

function idempotencyKey(payload) {
  return crypto.createHash("sha256")
    .update(`${payload.ticket_id}:${payload.event_id || payload.message}`)
    .digest("hex");
}

export function createHandler({
  seen = new Set(),
  customerLookup = async () => ({ plan: "synthetic", integrations: [] }),
  incidentLookup = async () => [],
  audit = async () => {}
} = {}) {
  return async function handler(event) {
    const payload = parseEvent(event);
    const key = idempotencyKey(payload);

    if (seen.has(key)) {
      return { statusCode: 200, body: JSON.stringify({ status: "duplicate_ignored", idempotency_key: key }) };
    }
    seen.add(key);

    const classification = classifyRequest(payload.message);
    const customer = await customerLookup(payload.customer_id || null);
    const incidents = await incidentLookup(classification.intent);
    const policy = policyFor({ intent: classification.intent, requestedAction: payload.requested_action || "" });

    const result = {
      status: "prepared",
      ticket_id: payload.ticket_id,
      idempotency_key: key,
      classification,
      context: { customer, matching_incidents: incidents },
      proposed_next_step: classification.intent === "integration_failure"
        ? "Check latest successful delivery, connection state and known incidents; prepare troubleshooting reply."
        : classification.intent === "access"
          ? "Verify identity-safe recovery path; prepare instructions without changing credentials."
          : "Route to the responsible queue and prepare a concise response draft.",
      policy,
      trace: [
        "webhook.received",
        "idempotency.checked",
        "request.classified",
        "customer.context_loaded",
        "incident.context_loaded",
        "policy.evaluated",
        "response.prepared"
      ]
    };

    await audit(result);
    return { statusCode: 200, body: JSON.stringify(result) };
  };
}

export const handler = createHandler();
