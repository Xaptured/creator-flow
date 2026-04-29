ALTER TABLE content DROP CONSTRAINT IF EXISTS content_owner_id_fkey;

CREATE INDEX IF NOT EXISTS idx_content_owner_id ON content (owner_id);

CREATE INDEX IF NOT EXISTS idx_content_owner_id_status ON content (owner_id, status);
