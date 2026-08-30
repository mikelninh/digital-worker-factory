# Kanzlei Autopilot — revenue funnel v1

The customer buys an outcome. Company 01 and the Authority Control Plane stay underneath.

```text
content / referral / search
        ↓
/kanzlei — free Timefresser Scan
        ↓
instant workload prioritisation
        ↓
optional explicit follow-up consent
        ↓
Company 01 lead intake
        ↓
source-specific deterministic qualification
        ↓
qualified → €990 net / 7-day Proof Week onboarding
nurture   → small Shadow workflow guidance
        ↓
1 recurring workflow
10–20 safe Shadow cases
1 accountable reviewer
        ↓
measured Proof Week
        ↓
KEEP_CANDIDATE / STOP_OR_ITERATE
        ↓
continuation only after explicit commercial acceptance
```

## Product hierarchy

Customer-facing: **Kanzlei Autopilot** — return lawyer time.

Operating platform: **Company 01** — build and operate trustworthy digital workers.

Infrastructure/moat: **Authority Control Plane / OCN** — decide and prove what autonomous systems may do before they act.

## Timefresser Scan truth boundary

The public scan ranks repeated workload signals. It does not estimate hours saved, promise ROI or infer willingness to pay.

Contact details are optional and appear only after the visitor receives the result. Company 01 stores a lead only after explicit follow-up consent.

Authority-score metrics remain `NULL` for Kanzlei workload scans. Qualification is source-specific and uses the scan's own explicit `qualification.qualified` field. This prevents workload evidence from being mislabeled as authority evidence.

## Paid Proof Week contract

- €990 net
- 7 days
- no automatic subscription
- one recurring workflow
- 10–20 safe historic/synthetic/redacted/controlled Shadow cases
- one accountable reviewer

KEEP requires observed value evidence plus zero recorded authority violations, critical misses and wrong-matter events.

## Scale path

Customer #2 must reuse the same Workflow Pack and Proof Week contract with a separate tenant/customer configuration. Customer names, credentials, private templates and private authority assumptions do not belong in shared Workflow Packs.

The first production Workflow Pack is `migration/document-readiness` in GitLaw.
