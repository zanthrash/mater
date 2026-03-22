CREATE TABLE inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  inspector_name text,
  gps_lat float8,
  gps_lon float8,
  equipment_data jsonb,
  condition_data jsonb,
  ai_image_result jsonb,
  vin_lookup_result jsonb,
  pdf_url text,
  photos jsonb
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
-- Placeholder: allow all access via service role (anon access blocked by default)
CREATE POLICY "service_role_all" ON inspections
  USING (true)
  WITH CHECK (true);
