-- Executable schema used by CI.
-- Synthetic support automation only.

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
