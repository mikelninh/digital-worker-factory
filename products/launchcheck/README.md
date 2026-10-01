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

`https://htffcvdopavknnylbowl.supabase.co/functions/v1/launchcheck-mcp`

The edge function is deployed in the existing `company-01` Supabase project.

## Release gates

1. Node deterministic test suite passes.
2. Official MCP Inspector initializes the deployed server.
3. `tools/list` advertises `audit_website`.
4. Live audit against `https://example.com` completes and returns the LaunchCheck schema.
5. Private-network regression against `127.0.0.1` is blocked.
6. Plugin package JSON parses.
7. Golden prompts preserve positive/negative routing boundaries.

## Structure

- `engine/launchcheck.mjs` — bounded audit engine
- `tests/launchcheck.test.mjs` — deterministic engine tests
- `supabase/functions/launchcheck-mcp/` — production MCP edge function
- `plugin/` — portable Agent Plugins package
- `submission/` — review cases and golden routing prompts

## Next release

**v0.2 — Browser Runtime**

Add a remote Chromium/browser worker for JavaScript rendering, viewport screenshots, click-path smoke tests, form validation, console errors, failed network requests, and layout overflow. Keep browser execution isolated from the MCP gateway and preserve the same evidence-first report contract.
