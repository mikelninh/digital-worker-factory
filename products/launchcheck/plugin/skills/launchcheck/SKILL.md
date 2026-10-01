---
name: launchcheck
description: Check a public website before launch using the LaunchCheck MCP audit tool.
---

# LaunchCheck

Use LaunchCheck when the user wants to **test, audit, smoke-check, preflight, verify, or find launch blockers on a public website URL**.

## Workflow

1. If the user supplied a public URL, call `audit_website`.
2. Lead with actual blockers, then warnings, then the strongest passes.
3. Preserve evidence URLs/statuses when they help the user reproduce an issue.
4. Separate what LaunchCheck observed from recommendations.
5. State the v0.1 static-audit limitation when the user asks about clicks, forms, JavaScript behavior, responsive layout, screenshots, console errors, or network failures.

## Good routing examples

- "Check my website before launch."
- "Does this landing page have broken links?"
- "Smoke test https://example.com."
- "Anything obvious wrong with this site before I send traffic to it?"
- "Check the mobile setup and launch metadata on this URL."

## Do not route

Do not use LaunchCheck merely to:
- build or redesign a website
- write or rewrite marketing copy
- research SEO keywords
- browse a private, authenticated, localhost, staging-on-LAN, or internal URL
- claim to have clicked UI, submitted a form, rendered JavaScript, or visually inspected a viewport in v0.1

If a request is outside v0.1, say what the static audit can still verify without pretending the unsupported check was performed.
