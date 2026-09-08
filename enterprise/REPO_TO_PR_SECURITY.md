# Repo-to-PR Security v2

> Connect a repository. Discover the agent runtime and effect paths. Reproduce impact. Generate the smallest supported code patch. Retest the same attacks. Prepare a PR only after zero executor impact.

## Flow

`REPO_DISCOVER → MAP_AGENT_EFFECTS → GENERATE_ATTACKS → REPRODUCE_IMPACT → GENERATE_CODE_PATCH → APPLY_IN_ISOLATED_WORKTREE → RETEST → PREPARE_PR → GATE`

This extends the manifest-based Autonomous Security Loop v1 with source-level repository intelligence.

## What v2 proves today

For a **supported direct-tool-dispatch runtime shape**, the engine can:

1. discover an agent runtime from source,
2. discover registered capabilities and infer declared risk,
3. detect model-selected direct handler execution,
4. map tenancy, budgets, audit signals, approvals and deterministic boundaries,
5. generate adversarial cases from the discovered surface,
6. reproduce actual executor impact through the target runtime contract,
7. generate a deterministic code patch that inserts an authority boundary before the handler,
8. apply that patch only inside an isolated worktree,
9. rerun the identical runtime attacks,
10. require zero post-patch executor calls,
11. emit a PR payload only after the code-level retest passes,
12. return `TECHNICAL_GO` or `TECHNICAL_NO_GO`.

The supported golden fixture intentionally starts vulnerable:

- 4 runtime attacks
- 4 impact escapes
- 4 executor calls

After the generated code patch:

- 0 impact escapes
- 0 executor calls
- `TECHNICAL_GO`
- PR payload ready

## Real-repository proof: SafeVoice

CI also checks out `mikelninh/safevoice` as a real, separate repository and scans it without modifications.

The scanner is expected to find, among other evidence:

- agent runtime(s),
- MCP server/tool surface,
- bounded execution,
- audit trail,
- model-to-tool dispatch.

SafeVoice deliberately **does not** receive an automatic fix in v2. It contains multiple agent/MCP surfaces, so the engine cannot yet prove which discovered tool is reachable from which model runtime. Combining all tools into one fictional attack graph would be unsafe. The correct v2 result is therefore:

`TECHNICAL_NO_GO · repository_discovery_requires_manual_review`

with a reachability blocker and no target-repository modification.

## Automatic rewrite boundary

Automatic source rewriting is intentionally narrow.

A code patch is produced only when the engine can prove it recognises the executor shape. The v1 rewrite contract is a JavaScript/TypeScript direct-tool-dispatch shape carrying the explicit marker:

`TRUSTREADY_AUTOFIX_TARGET: direct-tool-dispatch-v1`

Unmarked executors, Python executors, multiple execution paths, unknown tool risks, and ambiguous multi-agent/MCP graphs fail closed.

The generated boundary treats model output as a proposal and blocks:

- untrusted-origin effects,
- cross-tenant effects,
- protected-scope reads,
- sensitive egress to an unapproved model destination,
- effectful actions without explicit human approval.

## PR safety

The engine generates a PR payload only after the isolated worktree passes the same attack set with zero executor impact.

It does **not** auto-merge.

A production repository owner still controls review, merge and deployment.

## CLI

Discovery only:

```bash
node enterprise/repo-security-cli.mjs /path/to/repo
```

Supported automatic patch + code-level retest:

```bash
node enterprise/repo-security-cli.mjs /path/to/repo --autofix --out=repo-security.json
```

## CI

`.github/workflows/repo-to-pr-security.yml` runs both:

- the supported exploit → patch → retest proof,
- real SafeVoice repository discovery with a fail-closed reachability decision.

Both reports are uploaded as machine-readable CI artifacts.

## Truth boundary

`TECHNICAL_GO` means the discovered **supported** runtime shape passed the generated attack set after the generated source patch with zero executor impact.

It does not mean:

- every agent framework is supported,
- every repository path was semantically understood,
- every vulnerability was found,
- legal or regulatory compliance is certified,
- independent security review is unnecessary for high-consequence systems.

The key product rule is simple:

> If TrustReady cannot prove the graph or prove the rewrite, it does not patch and it does not say GO.
