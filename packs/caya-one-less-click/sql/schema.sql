-- Synthetic support-automation schema for the One Less Click proof.
-- Executable PostgreSQL DDL. No Caya data or production schema is represented.

CREATE TABLE IF NOT EXISTS support_events (
  id bigserial PRIMARY KEY,
  ticket_id text NOT NULL,
  event_id text NOT NULL,
  customer_id text,
  intent text NOT NULL,
  urgency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  UNIQUE (ticket_id, event_id)
);

CREATE TABLE IF NOT EXISTS integration_deliveries (
  id bigserial PRIMARY KEY,
  customer_id text NOT NULL,
  integration_type text NOT NULL,
  status text NOT NULL,
  delivered_at timestamptz NOT NULL,
  external_ref text
);

CREATE INDEX IF NOT EXISTS idx_integration_deliveries_customer_type_latest
  ON integration_deliveries (customer_id, integration_type, delivered_at DESC);

-- The executable query-plan exercise lives in benchmark.sql, where CI inserts
-- synthetic rows before running EXPLAIN (ANALYZE, BUFFERS). Keeping DDL and
-- benchmark separate means this file can be executed directly with psql.
--
-- UNIQUE(ticket_id, event_id) protects idempotent webhook ingestion.
-- A real deployment would additionally define retention, tenant isolation/RLS,
-- access controls, encryption and operational observability.
