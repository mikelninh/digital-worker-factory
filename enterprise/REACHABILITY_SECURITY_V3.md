# Repo-to-PR Security v3 — Reachability-Aware Agent Security

## Why v3 exists

Repository-level keyword discovery is useful but insufficient for agent security. A repository can contain several agents, shared frameworks, MCP servers, tests and tool registries that are not part of the same executable path.

v3 answers a narrower and more useful question:

> **Starting from this agent request, what code and tools can the model actually reach, what real effects can those tools trigger, and which deterministic boundary owns authority before those effects happen?**

## Reachability chain

`request/context → agent entrypoint → shared agent framework → reachable tool surface → deterministic boundary → effect sink`

The scanner now records:

- request-scoped authority identifiers such as `case_id`, `tenant_id`, `user_id`, `workspace_id`
- concrete agent entrypoints separately from reusable agent-loop/framework modules
- transitive local imports from the entrypoint
- only tools declared by modules reachable from that entrypoint
- reachable deterministic security-boundary modules
- network, process and filesystem effect sinks
- MCP servers that are reachable from the entrypoint versus MCP servers that are isolated surfaces
- compatible repository-native adversarial evidence tied to the resolved entrypoint

## Scoped TECHNICAL_GO

A repository-native runtime path can receive scoped `TECHNICAL_GO` when all of the following are true:

1. exactly one target entrypoint is statically resolved;
2. its reachable tool surface is non-empty;
3. a deterministic boundary is reachable on that path;
4. repository-native adversarial evidence contains at least one exploit-before-fix observation;
5. all evidence cases pass after the boundary with zero critical escapes;
6. the generated capability attack simulation also reaches zero executor impact.

The decision includes an explicit scope containing:

- entrypoint
- request authority inputs
- reachable tools
- effect paths
- excluded/isolated surfaces
- exact native evidence artifact

A scoped GO is **not** a claim that every runtime in the repository is secure.

## Real SafeVoice proof

SafeVoice previously failed closed because the repository contained both a Court-Prep agent runtime and a separate MCP server. v2 could see both but could not prove whether they belonged to one execution graph.

v3 resolves the actual path:

`case_id / user_id`
→ `backend/app/services/court_prep_agent.py`
→ `backend/app/services/agent_loop.py`
→ 8 Court-Prep tools
→ `re_archive_urls`
→ `backend/app/services/evidence.py`
→ network effect (`httpx` / archive.org)

It also resolves:

- `backend/app/services/court_prep_security.py` as the deterministic boundary on the Court-Prep path;
- `safevoice_mcp/server.py` as an isolated MCP surface, not part of the Court-Prep tool dispatch path;
- `security/agent-boundary-report.json` as native runtime evidence for the Court-Prep scope.

That native evidence proves two compromised-model attack paths:

- cross-case pivot: foreign case reachable before boundary → handler calls `0` after;
- model-invented archive target: mocked network calls `1 → 0`.

Result for the resolved Court-Prep scope:

- native adversarial cases: `2/2`
- critical escapes after boundary: `0`
- exploit-before-fix evidence: present
- scoped release: `TECHNICAL_GO`

## Fail-closed behavior

v3 still returns `TECHNICAL_NO_GO` / manual review when:

- no agent entrypoint can be resolved;
- multiple entrypoints cannot be disambiguated;
- the entrypoint has no reachable tool surface;
- tool risk remains unknown;
- MCP and non-MCP tool surfaces are both reachable from the same entrypoint but their relationship is ambiguous;
- dynamic/runtime-only behavior is required to determine reachability;
- an automatic source rewrite is not a supported proven shape.

## Truth boundary

Reachability v3 is deterministic **static** analysis plus explicit repository-native runtime evidence when available. Dynamic imports, reflection, runtime plugin registration, dependency injection, remote configuration and code outside the scanned repository can create paths the static graph cannot see.

`TECHNICAL_GO` is therefore scoped to the named entrypoint, reachable surface and evidence artifact. It is not certification, a guarantee of security, or proof that unknown vulnerabilities do not exist.
