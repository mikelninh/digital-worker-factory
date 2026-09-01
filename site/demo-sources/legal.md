# Synthetic source packet — Law firm

This file is intentionally synthetic. It exists so a reviewer can verify what is known, what is missing, and why the demo leaves the final legal decision to a lawyer.

## lease.pdf

- Residential lease
- Property: Berlin
- Lease start: **01 April 2023**
- Tenant: Lena Becker

## landlord_notice.pdf

- Document type: landlord termination notice
- Notice date printed on document: **14 August 2026**
- The document itself does **not** prove the date on which the tenant actually received it.

## client_timeline.md — full synthetic timeline

- 01 Apr 2023 — lease begins
- 14 Aug 2026 — landlord termination notice is dated
- 16 Aug 2026 — tenant writes: “I received the termination letter recently and want to understand my options.”
- 18 Aug 2026 — first law-firm intake call

There is **no exact delivery / receipt date** in the supplied timeline or notice.

## Why the demo marks a fact as missing

The system can see the date printed on the landlord notice, but that is not the same thing as the date the tenant received the notice. The supplied sources never state an exact receipt date.

Therefore the demo surfaces:

> Exact receipt date: **missing — ask client**

## Legal research

The synthetic product flow assumes relevant federal-law sources are retrieved through GitLaw and remain attached to any draft. This source packet does not assert a final legal conclusion.

No legal advice or external communication is sent automatically.