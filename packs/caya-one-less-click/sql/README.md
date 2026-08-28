# PostgreSQL execution proof

The proof contains two SQL tracks:

- `schema.sql`: readable architecture/reference exercise with the parameterized access pattern.
- `schema-ci.sql` + `benchmark.sql`: executable CI proof.

CI starts a real PostgreSQL service, creates the schema, inserts 20,000 synthetic delivery rows, runs `ANALYZE`, executes `EXPLAIN (ANALYZE, BUFFERS)` for the latest-delivery query and fails unless PostgreSQL uses `idx_integration_deliveries_customer_type_latest`.

The actual query plan is emitted to CI logs. No fixed latency number is claimed because runner timing is environment-dependent and is not representative of Caya production workloads.
