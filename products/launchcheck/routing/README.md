# LaunchCheck — 20-prompt routing gauntlet

This benchmark tests **discovery/routing**, not the website-audit engine itself.

OpenAI recommends a labelled golden set with direct, indirect, negative and boundary/follow-up requests, then recording which tool was selected and what arguments it received.

## Release target

- **Precision:** >= 95%
- **Recall:** >= 90% — with 12 positives this means at least 11/12 must route correctly
- **Negative specificity:** 100% — zero false activations across the 8 negative/boundary cases
- **URL argument accuracy:** >= 95%
- **Useful completion:** >= 90%
- **Boundary violations:** 0

In practical terms: **0 false positives, <= 1 false negative**.

## Before a run

1. Confirm the latest LaunchCheck MCP deployment is green in CI.
2. In ChatGPT, enable Developer mode.
3. Refresh the LaunchCheck connection after metadata/tool-description changes.
4. Install/enable LaunchCheck in **Work**.
5. Do **not** invoke LaunchCheck with @ for this benchmark. That would force selection and invalidate the routing test.
6. Copy `routing-results.template.json` to a dated results file, for example:
   `routing-results.2026-10-01-v1.json`.

## How to run

For **direct, indirect, negative and boundary** cases:
- start a fresh Work conversation for each case;
- paste the single prompt exactly;
- record whether `audit_website` was called;
- copy the tool arguments;
- mark `useful_result` true only if the returned result actually addressed the supported job.

For **follow_up** cases:
- start a fresh conversation;
- send each item in `turns` in order;
- score the **last turn**.

Record:
- `actual_tool`: `"audit_website"` if called, otherwise a different tool name or `null`;
- `actual_args`: the actual tool argument object, or `null`;
- `useful_result`: true/false when a supported positive case was called; false for a bad/irrelevant result;
- `component_rendered`: currently false/null because LaunchCheck v0.1 has no custom UI;
- `notes`: anything surprising.

## Score it

```bash
node products/launchcheck/routing/routing-score.mjs products/launchcheck/routing/routing-results.2026-10-01-v1.json
```

The scorer reports TP/FP/TN/FN, precision, recall, specificity, F1, URL argument accuracy, useful completion and boundary violations.

## Iteration rule

Change **one metadata field at a time**, refresh the plugin connection, rerun the same 20 cases, and compare scores. Do not change the benchmark prompts simply to make a weak revision look better.

Prioritise in this order:

1. eliminate false positives;
2. fix wrong/missing URL arguments;
3. improve recall on indirect/follow-up prompts;
4. only then widen scope.

## What counts as a routing bug

- LaunchCheck activates on copywriting, SEO research, design or general explanations.
- LaunchCheck activates for localhost/private/authenticated-browser work.
- LaunchCheck claims browser actions it cannot perform in v0.1.
- A relevant public-site preflight prompt does not select `audit_website`.
- The selected tool gets the wrong URL.

## What happens after PASS

Freeze the metadata revision, save the dated result file in this folder, and use the same cases as a regression set before every public submission or metadata change.
