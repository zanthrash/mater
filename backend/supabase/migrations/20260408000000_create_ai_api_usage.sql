-- Migration: create_ai_api_usage
-- Tracks per-request Anthropic API token usage and cost

CREATE TABLE IF NOT EXISTS ai_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  operation text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  cost_cents numeric NOT NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ai_api_usage_created_at_idx ON ai_api_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_api_usage_operation_idx ON ai_api_usage (operation);

ALTER TABLE ai_api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ai_api_usage"
  ON ai_api_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
