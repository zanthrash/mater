-- Normalize existing status values
UPDATE assets SET status = 'intake' WHERE status = 'ingested';

-- Composite index for time-range + status queries (dashboard KPIs, intake volume)
CREATE INDEX IF NOT EXISTS idx_assets_created_status ON assets (created_at DESC, status);

-- Index for operator aggregate queries (group by user_id with time range)
CREATE INDEX IF NOT EXISTS idx_assets_user_created ON assets (user_id, created_at DESC);

-- Index for intake event time-range queries (activity stream, AI insights)
CREATE INDEX IF NOT EXISTS idx_intake_events_created ON intake_events (created_at DESC);
