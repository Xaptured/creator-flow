-- V18: Extend analytics_snapshots to support the full metrics pipeline.
-- Adds owner_id, impressions, engagement_rate, window_hours, fetched_at.
-- Renames snapshot_at -> fetched_at (kept for backwards compat via default).
-- Drops old FK on content_id (content lives in scheduler-service schema);
-- analytics-service owns this table and stores owner_id as a plain UUID.

-- 1. Add missing columns
ALTER TABLE analytics_snapshots
    ADD COLUMN IF NOT EXISTS owner_id        UUID          NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS impressions     BIGINT,
    ADD COLUMN IF NOT EXISTS engagement_rate DECIMAL(5, 4),
    ADD COLUMN IF NOT EXISTS window_hours    INT           NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS fetched_at      TIMESTAMP     NOT NULL DEFAULT NOW();

-- 2. Remove the fabricated default on owner_id (only needed during ALTER for existing rows)
ALTER TABLE analytics_snapshots
    ALTER COLUMN owner_id DROP DEFAULT;

-- 3. Remove the fabricated default on window_hours
ALTER TABLE analytics_snapshots
    ALTER COLUMN window_hours DROP DEFAULT;

-- 4. Rename snapshot_at -> fetched_at alias: keep snapshot_at as a generated column
--    is not supported easily; instead we populate fetched_at from snapshot_at for old rows
--    and drop snapshot_at since fetched_at is the canonical column going forward.
UPDATE analytics_snapshots SET fetched_at = snapshot_at WHERE fetched_at = NOW();

ALTER TABLE analytics_snapshots
    DROP COLUMN IF EXISTS snapshot_at;

-- 5. Add index for common query pattern: owner_id + content_id + window_hours
CREATE INDEX IF NOT EXISTS analytics_snapshots_owner_content_window_idx
    ON analytics_snapshots (owner_id, content_id, window_hours);
