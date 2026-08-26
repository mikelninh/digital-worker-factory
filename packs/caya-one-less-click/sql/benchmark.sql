-- Executable PostgreSQL proof for CI.
-- Synthetic data only. No Caya production schema or customer data.

TRUNCATE integration_deliveries RESTART IDENTITY;

INSERT INTO integration_deliveries (customer_id, integration_type, status, delivered_at, external_ref)
SELECT
  'C-' || ((g % 80) + 1),
  CASE WHEN g % 3 = 0 THEN 'DATEV' WHEN g % 3 = 1 THEN 'SFTP' ELSE 'GOOGLE_DRIVE' END,
  CASE WHEN g % 11 = 0 THEN 'failed' ELSE 'delivered' END,
  now() - (g || ' seconds')::interval,
  'REF-' || g
FROM generate_series(1, 20000) AS g;

ANALYZE integration_deliveries;

EXPLAIN (ANALYZE, BUFFERS)
SELECT status, delivered_at, external_ref
FROM integration_deliveries
WHERE customer_id = 'C-7'
  AND integration_type = 'DATEV'
ORDER BY delivered_at DESC
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'integration_deliveries'
      AND indexname = 'idx_integration_deliveries_customer_type_latest'
  ) THEN
    RAISE EXCEPTION 'Expected composite index is missing';
  END IF;
END $$;
