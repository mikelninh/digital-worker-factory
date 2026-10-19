# SNOCKS — Junior AI Engineer · application angle

## The question I tried to answer

How do we turn customer-service work into value for support, product and supply chain while keeping trust boundaries and costs measurable?

SNOCKS already uses Shopify Sidekick to democratise Shopify reporting. I therefore **deliberately chose an adjacent cross-system workflow** rather than competing with a proven reporting use case.

## Why I built this

Having run an Amazon FBA e-commerce company, I know the gap between a customer's frustrated message and the operational work required to fix the underlying problem. Through AI Engineering projects such as GitLaw, PrüfPilot and Digital Worker Factory, I learned to connect retrieval and tools to deterministic checks and accountable human actions.

## What works in this proof

- API + SQLite: customer case, mock order, versioned mock policies, SQL SKU quality signal.
- Bounded agent: safe response proposal from independently resolved demo data, optional live LLM classification.
- Approval: no simulated send until reviewer approves. Missing order / injection fail closed.
- Feedback: reviewer flags and trace stored for future evaluation.
- Tests: executable automated API suite + distinct synthetic regression suite.

## What I would ask SNOCKS before any implementation

1. Which end-to-end operations waste time **outside Shopify Sidekick's current capabilities**?
2. What support / ERP / commerce events and identifiers can actually be joined safely?
3. Which actions need strict human release and which can eventually become low-risk automatic workflows?
4. What baseline can we measure over an initial shadow-mode pilot (handling time, correction rate, source coverage, escaped actions, token cost, p95 latency)?
5. Who owns the process after handoff, and how will colleagues self-serve improvements?

## Suggested 3-project portfolio (matching the role's parallel ownership)

- Week 1: Support → Product Quality signal (this proof; measure signal quality)
- Week 2: Stock/returns mismatch monitor (SQL checks + alert criteria, no action automation)
- Week 3: Feedback-to-eval pipeline (review corrections generate labelled synthetic/regression cases)

Projects two and three are **proposals**, not implemented features.

## Short intro for a recruiter

„Ich habe mehrere Jahre selbst ein E-Commerce-Unternehmen aufgebaut. Deshalb weiß ich aus eigener Erfahrung, wie viel Arbeit zwischen einer Kundenanfrage, den operativen Daten und einer echten Lösung liegt. Nach meiner Weiterbildung im AI Engineering entwickle ich mit Python, APIs und LLMs genau solche Anwendungen. Meine kleine Arbeitsprobe RETURN LOOP zeigt, wie eine Kundenbeschwerde nicht nur zu einer prüfbaren Antwort, sondern auch zu einem Signal für Produkt- und Supply-Chain-Teams werden kann. Mit synthetischen Daten, klaren Sicherheitsgrenzen und ausführbaren Tests.“
