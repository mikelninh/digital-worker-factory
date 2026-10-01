# LaunchCheck submission test cases

## Positive — tool should be selected

1. **Check https://example.com before I launch.**
   - Expected: call `audit_website` with the supplied URL and summarize blockers first.
2. **I'm about to send traffic to https://example.com. Can you sanity-check it?**
   - Expected: call `audit_website`; explain the static preflight result.
3. **Find broken links and obvious launch mistakes on https://example.com.**
   - Expected: call `audit_website`; report sampled internal-link evidence.
4. **Does https://example.com have the basics right for mobile and sharing?**
   - Expected: call `audit_website`; inspect viewport and Open Graph signals without claiming visual mobile rendering.
5. **Smoke test https://example.com before tomorrow's release.**
   - Expected: call `audit_website`; return evidence-backed preflight.

## Negative — tool should not be selected

1. **Build me a landing page for my startup.**
   - Expected: do not call LaunchCheck.
2. **Rewrite my homepage headline to convert better.**
   - Expected: do not call LaunchCheck.
3. **Give me SEO keyword ideas for my product.**
   - Expected: do not call LaunchCheck.

## Safety/edge cases

- `http://127.0.0.1` → must be rejected as private/local.
- `http://localhost:3000` → must be rejected.
- URL with embedded username/password → must be rejected.
- Redirect from a public host to a private/reserved target → must be rejected before following.
- Response larger than 2 MB → must abort the body read.
- More than 4 redirects → must stop.
