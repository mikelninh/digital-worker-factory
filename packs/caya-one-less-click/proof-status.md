# Proof status

| Capability | Status | Evidence |
| --- | --- | --- |
| Deterministic workflow | Executed | 30-case regression suite |
| HTTP end-to-end | Executed | Real loopback POST requests in CI |
| PostgreSQL | Executed | PostgreSQL service, 20k synthetic rows, `EXPLAIN ANALYZE`, index-use assertion |
| AWS Lambda | Deployable | Lambda-compatible handler + AWS SAM manifest; not deployed to an AWS account |
| Zapier | Adapter-ready | Concrete webhook contract + payload; no live Zapier account connection |
| Public UI | Live | GitHub Pages presentation layer |

No Caya customer data, private APIs or production schemas are used.
