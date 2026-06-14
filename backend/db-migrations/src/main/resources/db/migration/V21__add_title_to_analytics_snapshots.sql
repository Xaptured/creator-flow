-- CF-94: store a human-readable content title on each analytics snapshot
-- so the analytics UI (top posts, per-post detail) can show titles instead of raw IDs.
-- Threaded from media-service's content-published event through the metric-fetch job.
ALTER TABLE analytics_snapshots
    ADD COLUMN IF NOT EXISTS title VARCHAR(500);
