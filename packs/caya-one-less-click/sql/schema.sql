-- Synthetic support-automation schema for the One Less Click proof.
-- PostgreSQL-oriented. No Caya data or production schema is represented.

CREATE TABLE support_events (
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

CREATE TABLE integration_deliveries (
  id bigserial PRIMARY KEY,
  customer_id text NOT NULL,
  integration_type text NOT NULL,
  status text NOT NULL,
  delivered_at timestamptz NOT NULL,
  external_ref text
);

CREATE INDEX idx_integration_deliveries_customer_type_latest
  ON integration_deliveries (customer_id, integration_type, delivered_at DESC);

EXPLAIN (ANALYZE, BUFFERS)
SELECT status, delivered_at, external_ref
FROM integration_deliveries
WHERE customer_id = $1
  AND integration_type = $2
ORDER BY delivered_at DESC
LIMIT 1;

-- UNIQUE(ticket_id, event_id) protects idempotent webhook ingestion.
-- A real deployment would additionally define retention, tenant isolation/RLS,
-- access controls, encryption and operational observability.
