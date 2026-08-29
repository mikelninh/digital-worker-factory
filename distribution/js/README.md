# `@mikelninh/ocn` — OCN Guard JS

The intended developer experience is one wrapper around existing tools. OCN is called before risky work; blocked/review-required work does not reach the underlying tool by default.

## Target usage

```js
import { createPaidOCNClient, withOCNGuard } from '@mikelninh/ocn'

const ocn = createPaidOCNClient({
  baseUrl: process.env.OCN_BASE_URL,
  privateKey: process.env.OCN_BUYER_EVM_KEY, // dedicated agent wallet
  maxPaymentAtomic: 20_000n,                 // $0.02 USDC ceiling
})

const guard = withOCNGuard({ client: ocn })

const safeTools = guard.wrapTool(
  existingToolExecutor,
  async (toolName, args, ctx) => ({
    actorId: ctx.agentId,
    capabilityId: `tool.${toolName}.v1`,
    risk: toolName.startsWith('send_') ? 'consequential' : 'read',
    grants: ctx.grants ?? [],
    humanApproval: ctx.humanApproval === true,
  }),
)
```

Now every guarded tool invocation starts with a paid OCN preflight. `block` stops the call. `review` stops the call unless the embedding application's explicit policy opts into execution. Payment success alone never changes authority.

## Launch safety

v0.1 is intentionally Base Sepolia only. Use a dedicated test wallet. Remote OCN endpoints require HTTPS. The SDK selects only exact Base Sepolia Circle test-USDC payment requirements within the configured cap.

Before npm publication:

1. distribution CI green from a clean install;
2. public OCN HTTPS endpoint live;
3. external paid testnet call through this SDK;
4. repeat-call/idempotency behavior proven;
5. README examples tested against deployed version;
6. package provenance/signing configured;
7. mainnet remains disabled until merchant/accounting/refund controls pass.
