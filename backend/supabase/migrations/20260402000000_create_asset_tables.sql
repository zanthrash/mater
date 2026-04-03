-- Migration: create_asset_tables
-- Creates tables for asset ingestion: assets, intake_events, taxonomy

-- ============================================================
-- TRIGGER FUNCTION: update_updated_at_column
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- TABLE: assets
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  vin_serial text,
  category text,
  type text,
  subtype text,
  make text,
  model text,
  year integer,
  engine_type text,
  transmission text,
  gvw_lbs integer,
  hours_on_meter integer,
  type_specific_specs jsonb DEFAULT '{}',
  lot_number text,
  yard_location text,
  consignor text,
  photos jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'ingested'
);

-- Indexes on assets
CREATE INDEX IF NOT EXISTS assets_status_idx ON assets (status);
CREATE INDEX IF NOT EXISTS assets_category_idx ON assets (category);
CREATE INDEX IF NOT EXISTS assets_make_idx ON assets (make);
CREATE INDEX IF NOT EXISTS assets_created_at_idx ON assets (created_at DESC);

-- Updated_at trigger for assets
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS on assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_assets"
  ON assets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE: intake_events
-- ============================================================
CREATE TABLE IF NOT EXISTS intake_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  operator_name text,
  gps_lat numeric,
  gps_lon numeric,
  ai_analysis_result jsonb,
  vin_lookup_result jsonb,
  ai_taxonomy_result jsonb,
  source_photos jsonb DEFAULT '[]'
);

-- Index on intake_events
CREATE INDEX IF NOT EXISTS intake_events_asset_id_idx ON intake_events (asset_id);

-- RLS on intake_events
ALTER TABLE intake_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_intake_events"
  ON intake_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE: taxonomy
-- ============================================================
CREATE TABLE IF NOT EXISTS taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  type text NOT NULL,
  subtype text
);

-- Index on taxonomy
CREATE INDEX IF NOT EXISTS taxonomy_category_type_idx ON taxonomy (category, type);

-- RLS on taxonomy
ALTER TABLE taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_taxonomy"
  ON taxonomy
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
