# HausPilot Privacy Proof Pack

Purpose: make the first customer pilot privacy process explicit, repeatable and auditable. This is an operational checklist, not legal advice or a substitute for a customer-specific legal assessment.

## Default rule

Use the lowest-data mode that can answer the pilot question:

1. `synthetic` — no customer data.
2. `anonymised` — preferred for historical replay. Requires `anonymisation_confirmed=true` and a direct-identifier sanity scan.
3. `pseudonymised_personal_data` / `authorised_personal_data` — still treated as personal data. Extra gates are mandatory before model processing.

Pseudonymisation is a security/privacy measure; it does not automatically take data outside GDPR scope.

## Customer kickoff questions

Before any real data is accepted, record:

- What exact workflow are we testing?
- Which fields are genuinely necessary for that workflow?
- Can the 20–50 historical cases be truly anonymised first?
- Who at the customer authorises use of the cases?
- Who is the named reviewer?
- What retention period is agreed? V1 recommends 14 days or less.
- Are special-category data likely to occur? If yes, stop for specific review.

For personal/pseudonymised data also record:

- privacy review confirmed;
- legal basis / documented instruction confirmed by customer;
- controller / processor roles reviewed;
- processor terms / AVV arrangement reviewed;
- subprocessors reviewed;
- retention and deletion process confirmed;
- data-residency / transfer decision recorded;
- special-category review where applicable.

## Typical role model to review contractually

A common setup may be:

- customer = controller / Verantwortlicher;
- HausPilot service provider = processor / Auftragsverarbeiter;
- OpenAI = subprocessor used by the HausPilot service provider.

Do not present this as automatically true for every engagement. Confirm the actual roles and contracts for the specific customer.

## Technical proofs

### Before model processing

`node packs/hauspilot/runtime/preflight.mjs <pilot-dir>`

Must pass. It validates:

- V1 is shadow-only;
- scope/data/operator/retention gates;
- data-mode-specific privacy gates;
- obvious secrets;
- obvious direct identifiers when `data_mode=anonymised`;
- case count/template consistency;
- retention configuration.

### Privacy Manifest

`node packs/hauspilot/privacy/manifest.mjs <pilot-dir>`

Produces `privacy-manifest.json` containing:

- pilot/data mode;
- retention days;
- gate states;
- `openai_store=false`;
- `model_execution_tools=0`;
- `external_execution_allowed=false`;
- SHA-256 hashes and byte sizes of input files;
- no raw input contents.

The manifest deliberately does **not** claim ZDR or EU-only processing unless those provider controls are separately verified for the concrete deployment.

## OpenAI API facts we may communicate

Supported by current OpenAI documentation as of August 2026:

- business/API inputs and outputs are not used to train models by default unless the customer opts in;
- OpenAI provides a Data Processing Addendum;
- OpenAI reports SOC 2 Type 2 and ISO 27001/27017/27018/27701 for relevant business/API systems;
- API inputs/outputs may generally be retained for up to 30 days for service/abuse monitoring, subject to endpoint/configuration details;
- eligible customers can separately configure/request Zero Data Retention;
- eligible API customers have regional/data-residency options on supported configurations.

Important: `store:false` only prevents storing a Response for later API retrieval. It is not equivalent to ZDR.

## Primary sources

- GDPR: https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679
- EDPB Guidelines 01/2025 on Pseudonymisation: https://www.edpb.europa.eu/public-consultations/guidelines-012025-on-pseudonymisation_de
- OpenAI DPA: https://openai.com/de-DE/policies/data-processing-addendum/
- OpenAI Enterprise/API Privacy: https://openai.com/de-DE/enterprise-privacy/
- OpenAI Security & Privacy: https://openai.com/security-and-privacy/
- OpenAI Subprocessor List: https://openai.com/de-DE/policies/sub-processor-list/
- OpenAI ZDR information: https://openai.com/de-DE/index/offering-zero-data-retention-for-frontier-models/

## Never claim without evidence

Do not say:

- “GDPR compliant” as a blanket product claim;
- “fully anonymised” solely because names were replaced;
- “Zero Data Retention” unless the actual organization/project retention setting is verified;
- “EU-only” unless the actual API project/deployment is configured and verified accordingly;
- “no data is retained by OpenAI” based only on `store:false`.

## First-customer handover evidence

Customer can receive:

1. scope/SOW;
2. data-mode decision;
3. completed approval checklist;
4. privacy manifest;
5. pilot report;
6. deletion/retention confirmation at the agreed end of the pilot;
7. links/current copies of relevant provider privacy documents if requested.
