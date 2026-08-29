# Authority Service — 5-minute quickstart

This starts the **reference** Authority Service locally. It is intentionally not presented as a hardened public deployment.

## 1. Start the service

Requires Node.js 22+.

### PowerShell

```powershell
$env:AUTHORITY_TOKEN="local-demo-secret"
node core/authority/demo/server.mjs
```

### macOS / Linux

```bash
AUTHORITY_TOKEN=local-demo-secret node core/authority/demo/server.mjs
```

Default address:

```text
http://127.0.0.1:8787
```

Local reference state is stored in `.authority-data/` and ignored by Git.

## 2. Health check

```bash
curl http://127.0.0.1:8787/health
```

Expected:

```json
{"ok":true,"service":"authority","version":"v1"}
```

## 3. Preflight an action

Preflight evaluates authority but **never calls the provider**.

Save this as `authority-request.json`:

```json
{
  "actor": {
    "id": "research-agent-7",
    "role": "research_agent",
    "autonomyLevel": 3
  },
  "principal": {
    "id": "public-buildings-lab",
    "type": "public_body"
  },
  "delegation": {
    "id": "delegation-demo-1",
    "delegateId": "research-agent-7",
    "principalId": "public-buildings-lab",
    "scopes": ["research.purchase_data"],
    "purposes": ["public_building_energy_research"],
    "validUntil": "2026-09-01T00:00:00.000Z"
  },
  "action": {
    "type": "research.purchase_data",
    "purpose": "public_building_energy_research",
    "vendorId": "benchmark-pack",
    "amount": {"currency":"EUR","value":1.2},
    "counterpartyApproved": true,
    "idempotencyKey": "quickstart-purchase-1"
  },
  "evidence": {
    "claims": ["vendor_terms_checked", "source_relevant"]
  },
  "metrics": {
    "cases": 300,
    "acceptanceRate": 0.995,
    "correctionRate": 0.004,
    "unsafeExecutions": 0
  },
  "budget": {
    "currency": "EUR",
    "spent": 0,
    "limit": 10
  }
}
```

Then:

```bash
curl -X POST http://127.0.0.1:8787/v1/preflight \
  -H "Authorization: Bearer local-demo-secret" \
  -H "Content-Type: application/json" \
  --data-binary @authority-request.json
```

You should see an `ALLOW` decision and no provider execution.

## 4. Execute the authorised action

```bash
curl -X POST http://127.0.0.1:8787/v1/invoke \
  -H "Authorization: Bearer local-demo-secret" \
  -H "Content-Type: application/json" \
  --data-binary @authority-request.json
```

This uses the deterministic demo provider and emits an authority receipt.

Run the same command again. The consequence must **not** execute twice; the second call should be suppressed by the idempotency boundary.

## 5. Inspect receipts

```bash
curl http://127.0.0.1:8787/v1/receipts \
  -H "Authorization: Bearer local-demo-secret"
```

Receipts contain authority metadata and digests, not raw action/evidence payloads.

## 6. Revoke the delegation

```bash
curl -X POST http://127.0.0.1:8787/v1/delegations/delegation-demo-1/revoke \
  -H "Authorization: Bearer local-demo-secret" \
  -H "Content-Type: application/json" \
  -d '{"revokedBy":"demo-admin","reason":"operator stop"}'
```

Now change the request to a fresh idempotency key and invoke it again. The authority service should return `BLOCK` with `delegation_revoked`, and the provider should not be called.

## 7. Run the full deterministic proof

```bash
node --test \
  core/authority/conformance.test.mjs \
  core/authority/concurrency.test.mjs \
  core/authority/service.test.mjs \
  core/authority/interop/interop.test.mjs \
  core/authority/adapters/adapters.test.mjs \
  core/authority/stores/json-file.test.mjs \
  core/authority/profiles/public-sector.test.mjs \
  core/authority/demo/mission.test.mjs \
  core/authority/ui-parity.test.mjs

node core/authority/demo/run.mjs
```

## What this proves — and what it does not

This proves the reference authority boundary, policy semantics, provider gating, idempotency behavior, receipt minimization, revocation, interop mappings and deterministic demo mission.

It does **not** claim:

- public internet deployment;
- production-grade multi-replica storage;
- formal Agent Hooks / Governed Contract certification;
- legal or AI Act compliance;
- that the deterministic demo purchases are live x402 settlements.

The earlier real Base Sepolia x402 repeat run is separate evidence and should remain separately identified in the Proof Registry.
