## Live proof addendum

The proof now distinguishes presentation, execution and external deployment explicitly:

- **Executed in CI:** deterministic 30-case regression, real loopback HTTP requests, duplicate replay, approval boundary, audit count, real PostgreSQL schema/seed/`EXPLAIN ANALYZE` against a service container.
- **Deployable:** AWS Lambda handler shape plus an AWS SAM manifest for `POST /support`.
- **Adapter-ready:** Zapier webhook payload and flow documentation.
- **Not claimed:** a live AWS account deployment, a live Zapier account connection, Caya production data, real-world model accuracy or production database latency.

Use `bash packs/caya-one-less-click/run-all-proofs.sh` to run the local proof suite; CI supplies PostgreSQL automatically.
