# LaunchCheck v0.1

**Ask ChatGPT to check a public website before you launch it.**

LaunchCheck is the first product built on the Digital Worker Factory plugin foundation. It exposes one deliberately narrow MCP tool: `audit_website`.

## User job

> "Check this website before I launch."

v0.1 returns an evidence-backed preflight with:

- root HTTP reachability and redirects
- sampled broken same-origin links
- title, meta description, canonical, Open Graph, and robots signals
- mobile viewport and document language
- H1 structure and image alt-attribute coverage
- HSTS, Content-Security-Policy, and nosniff header signals
- launch score, verdict, blockers, warnings, passes, and checked URLs

## Truth boundary

v0.1 is a **bounded static HTTP audit**. It does **not** execute JavaScript, click controls, submit forms, inspect visual layout, or read browser console/network state. Those browser-runtime checks are explicitly reserved for a later release.

## Safety boundary

- public HTTP(S) targets only
- credentials in URLs rejected
- localhost, local/internal suffixes, private IPs, link-local IPs, carrier-grade NAT, documentation ranges, and reserved ranges rejected
- DNS A/AAAA answers checked before requests
- redirects revalidated
- maximum response body: 2 MB
- maximum redirect hops: 4
- maximum sampled internal links: 12
- read-only MCP annotations

## Production MCP

`https://launchcheck-ai.netlify.app/mcp`

The public MCP endpoint is served from the `launchcheck-ai.netlify.app` front door and proxies to the proven `company-01` Supabase runtime. The same Netlify origin also owns `/.well-known/openai-apps-challenge` for OpenAI domain verification.

## Release gates

1. Node deterministic test suite passes.
2. Official MCP Inspector initializes the deployed server.
3. `tools/list` advertises `audit_website`.
4. Live audit against `https://example.com` completes and returns the LaunchCheck schema.
5. Private-network regression against `127.0.0.1` is blocked.
6. Plugin package JSON parses.
7. The 20-case routing benchmark stays structurally valid and covers direct, indirect, follow-up, negative, and boundary intents.
8. Developer-mode routing release target: zero false positives, at least 11/12 relevant prompts caught, >=95% URL argument accuracy, and zero boundary violations.

## Structure

- `engine/launchcheck.mjs` — bounded audit engine
- `tests/launchcheck.test.mjs` — deterministic engine tests
- `supabase/functions/launchcheck-mcp/` — production MCP edge function
- `plugin/` — portable Agent Plugins package
- `submission/` — public-review cases and submission materials
- `routing/` — 20-prompt discovery benchmark, results template, scorer, and runbook

## Routing benchmark

The discovery benchmark lives in `routing/routing-benchmark.json`. Run it manually in ChatGPT Developer Mode without forcing the plugin with `@`, record outcomes in a copy of `routing-results.template.json`, then score the run with:

```bash
node products/launchcheck/routing/routing-score.mjs <results.json>
```

A routing revision passes only when irrelevant/unsupported requests stay clean while relevant public-site preflight intents reliably select `audit_website` with the correct URL.

## Next release

**v0.2 — Browser Runtime**

Add a remote Chromium/browser worker for JavaScript rendering, viewport screenshots, click-path smoke tests, form validation, console errors, failed network requests, and layout overflow. Keep browser execution isolated from the MCP gateway and preserve the same evidence-first report contract.
