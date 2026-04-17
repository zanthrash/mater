-- voice_notes column on assets
ALTER TABLE assets ADD COLUMN voice_notes jsonb DEFAULT '[]';

-- pending voice notes (pre-submit staging)
CREATE TABLE IF NOT EXISTS pending_voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  temp_path text NOT NULL,
  public_url text NOT NULL,
  duration_seconds integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  transcript text,
  transcription_status text NOT NULL DEFAULT 'pending'
);
CREATE INDEX ON pending_voice_notes (session_id);
