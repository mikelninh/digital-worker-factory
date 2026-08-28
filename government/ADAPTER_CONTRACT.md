# OCN Provider Adapter Contract

The Open Capability Network must connect existing specialist products without copying their business logic into one monolith.

## Adapter shape

Each provider adapter binds one versioned capability to one provider execution path.

```js
createCapabilityAdapter({
  capabilityId: 'judge.output.v1',
  version: '0.1.0',
  protocol: 'http',
  provider: 'judge-mcp',
  timeoutMs: 10000,
  validate,
  execute,
})
```

Required guarantees:

- exact capability ID/version.
- explicit protocol.
- input validation before provider call.
- bounded timeout.
- request-ID propagation.
- stable provider error envelope at gateway boundary.
- remote HTTP providers require HTTPS.
- adapter cannot grant authority or bypass the gateway policy gate.

## Why adapters, not rewrites

Existing providers remain separately testable and deployable. Their domain logic and golden cases stay close to the product that owns them. OCN standardizes discovery, invocation, evidence, policy, receipts and deployment metadata around them.

This lets a public IT provider choose:

1. OCN managed adapter to provider.
2. provider hosted inside customer VPC.
3. customer-owned implementation of the same capability contract.

## First adapters

Priority order:

1. `judge.output.v1` -> judge-mcp.
2. `document.preflight.v1` -> PrüfPilot.
3. `legal.gitlaw.de.v1` -> GitLaw.
4. `openproof.verify.v1` -> OpenAction/OpenProof.

Each adapter graduates from `adapter_ready` to `live` only after:

- reachable HTTPS endpoint.
- input/output contract tests.
- provider timeout/error tests.
- capability eval/golden-case link.
- privacy/retention profile verified.
- hosted smoke test.

For paid machine access, payment verification is an outer gateway concern. It does not alter provider authority or trust semantics.
