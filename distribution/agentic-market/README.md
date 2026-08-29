# x402 Bazaar / Agentic.Market → OCN

OCN trusted-event routes use the official x402 Bazaar discovery extension. The distribution goal is that an agent searching for verification, freshness, evidence, authority or entity-resolution services can discover OCN without already knowing the hostname.

## Resource set

- `trust.preflight.v1` — $0.005
- `evidence.verify.v1` — $0.003
- `freshness.verify.v1` — $0.001
- `authority.check.v1` — $0.002
- `entity.resolve.org.v1` — $0.01

## Indexing sequence

1. Deploy the exact green OCN commit to public HTTPS.
2. Start on Base Sepolia.
3. Confirm unpaid calls return x402 v2 `402 Payment Required`.
4. Complete successful paid calls for each resource with Bazaar discovery metadata attached.
5. Query the facilitator discovery API by `payTo`, URL and semantic search terms.
6. Verify input schema, price, network and description are correct.
7. Repeat with an external buyer wallet.
8. Record unique payer, repeat calls, latency and settlement success in the Control Center.
9. Only then consider Base mainnet.

## Search language to optimize

Descriptions and tags should map to real agent intent, not brand language:

- "check whether this agent action is allowed"
- "verify evidence and provenance"
- "check if source data is fresh"
- "check authority before a write or payment"
- "resolve company or organisation identity"
- "evaluate an AI output against a rubric"

## Success metrics

The primary signal is not raw impressions. Track:

1. unique external paying agents;
2. repeat payers over 7/30 days;
3. trusted events per payer per day;
4. payment success rate;
5. p50/p95 latency;
6. gross revenue per 1,000 trusted events;
7. downstream prevented/reviewed actions;
8. outcome-labelled correctness/override rate.
