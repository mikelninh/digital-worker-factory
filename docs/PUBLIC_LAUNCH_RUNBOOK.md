# OCN Public Launch Runbook — M2 → M4

This runbook intentionally launches **testnet assurance infrastructure**, not mainnet revenue or production-sensitive workloads.

## 1. Deploy exact branch with Render Blueprint

Deploy button:

[Deploy OCN Trust Rail to Render](https://render.com/deploy?repo=https://github.com/mikelninh/digital-worker-factory/tree/feat/gov-launch-actual)

The committed `render.yaml` creates:

- one public Docker web service;
- Frankfurt region;
- Base Sepolia x402 only;
- public receiver address only (no seller key);
- generated private feedback token;
- health check on `/v1/network/health`;
- assigned Render URL automatically copied into `OCN_PUBLIC_BASE_URL`;
- auto-deploy disabled so a branch push does not silently replace the evidence build.

The Blueprint uses the free instance for the first proof to avoid automatic cost. Render free services may spin down after 15 minutes of inactivity; upgrade after M3/M4 when continuous low-latency availability matters.

## 2. Capture immutable deployment evidence

Record:

- public HTTPS base URL;
- deployed Git commit SHA (`RENDER_GIT_COMMIT` in Render);
- deployment timestamp;
- network `eip155:84532`;
- seller `PAY_TO` address;
- health response;
- discovery document;
- exact Trust Proof Registry version.

Do not mark M2 achieved unless the public endpoint is reachable outside the operator machine.

## 3. External read-only checks

Open/call:

```text
GET <PUBLIC_URL>/v1/network/health
GET <PUBLIC_URL>/.well-known/trusted-events.json
GET <PUBLIC_URL>/.well-known/open-capabilities.json
GET <PUBLIC_URL>/v1/trust/metrics
```

Expected:

- HTTP 200;
- testnet network;
- trusted-event discovery includes `freshness.verify.v1` and `payment.intent.preflight.v1`;
- no secrets/private keys in responses;
- health may be `degraded` only because Judge provider is optional/not configured; trusted events must still be usable.

## 4. M3: one real external paid trusted event

On the buyer machine, keep the existing `.env.buyer` private. Set only public/non-secret overrides in the shell.

PowerShell:

```powershell
$env:OCN_BASE_URL="https://YOUR-SERVICE.onrender.com"
$env:OCN_SMOKE_EVENT="freshness"
$env:OCN_SMOKE_REPEATS="1"
npm.cmd run smoke:trusted
```

Required evidence:

- HTTP 200;
- capability `freshness.verify.v1`;
- `PAYMENT-RESPONSE` settlement success;
- Base Sepolia transaction hash;
- receipt says `paymentGrantedAuthority: false`;
- no consequential action;
- measured latency.

Then run the fraud/intent event:

```powershell
$env:OCN_SMOKE_EVENT="payment-intent"
$env:OCN_SMOKE_REPEATS="1"
npm.cmd run smoke:trusted
```

Required evidence additionally:

- capability `payment.intent.preflight.v1`;
- deterministic intent result;
- `paymentExecutionPerformed: false`.

## 5. Repeat-payment proof

After single-call success:

```powershell
$env:OCN_SMOKE_EVENT="freshness"
$env:OCN_SMOKE_REPEATS="10"
npm.cmd run smoke:trusted
```

Then, if still healthy and under the wallet spend policy:

```powershell
$env:OCN_SMOKE_REPEATS="20"
npm.cmd run smoke:trusted
```

The harness is capped at 20 calls and refuses remote HTTP, unsafe networks/assets and over-cap x402 offers.

Operator-controlled repeat calls prove system/payment repeatability, **not M4 market demand**. M4 requires an independent external buyer.

## 6. Bazaar / Agentic.Market discovery

Once successful x402 traffic reaches the public routes with Bazaar discovery extensions:

- verify the public service appears/is discoverable through the relevant x402 Bazaar/Agentic.Market surface;
- capture the listing/search evidence;
- ensure endpoint metadata names the exact capability, price and schema;
- do not claim discovery until the service is actually indexed.

## 7. M4 external payer

Give an independent developer:

- public base URL;
- free discovery URL;
- MCP or JS Guard install path;
- testnet funding instructions;
- default maximum-spend recommendation;
- Trust Proof Registry URL.

Exit gate:

- wallet/buyer not controlled by OCN operator;
- at least 20 paid calls across at least two sessions;
- developer confirms the output is useful;
- no unsafe price/network/asset was accepted.

## 8. M5 Shadow Mode

Connect OCN to one existing external workflow with **no blocking/execution authority**.

Best first cases:

1. agentic payment / invoice / supplier payment;
2. support agent refund/account change;
3. government application/document/decision support;
4. procurement/AP agent;
5. cloud/DevOps write agent.

Measure useful catches, false-positive/false-negative adjudication, review time, latency, and audit completeness.

## 9. Production promotion

Do not treat the free Render instance as production. Before enforcement/regulated production:

- paid continuously available compute;
- durable external telemetry/outcome store;
- WAF/rate limits/abuse controls at edge;
- customer authentication/tenant isolation;
- source/credential provider assurance;
- incident/rollback/runbooks;
- load evidence;
- independent security review;
- appropriate privacy/compliance controls.
