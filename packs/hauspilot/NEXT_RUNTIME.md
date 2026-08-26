# Next runtime milestone

The next implementation after the reusable pack is a **shadow-only inference runner**.

Input:

```json
{
  "template": "repair_intake",
  "case": {},
  "context": {}
}
```

Output must conform to the shared structured contract:

```json
{
  "case_id": "...",
  "classification": "...",
  "summary": "...",
  "evidence": [],
  "missing_information": [],
  "proposed_action": {},
  "approval_state": "shadow_only"
}
```

Constraints:

- no external write tools
- no guessed facts when evidence is absent
- explicit evidence references
- strict structured output
- no production persistence by default where provider settings permit
- client policy applied after inference, outside the model
- all live actions remain separate executor capabilities

This runner should be provider-isolated behind one interface so model changes do not change workflow templates.
