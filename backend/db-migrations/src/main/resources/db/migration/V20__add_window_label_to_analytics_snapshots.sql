-- V20: Add window_label to analytics_snapshots.
--
-- Purpose: store a human-readable label for the metric fetch window alongside
-- the raw window_hours value.  The label is set by PlatformScheduleConfig and
-- varies by platform:
--   Twitter / Instagram: "1 hour", "24 hours", "7 days"
--   YouTube:             "3 days", "7 days",   "30 days"
--
-- Backfill: derive a sensible label from existing window_hours values so that
-- old rows are not left NULL.  New rows will have the label set by the service.

ALTER TABLE analytics_snapshots
    ADD COLUMN IF NOT EXISTS window_label VARCHAR(20);

-- Backfill existing rows using window_hours
UPDATE analytics_snapshots
SET window_label = CASE
    WHEN window_hours < 24  THEN window_hours || CASE WHEN window_hours = 1 THEN ' hour' ELSE ' hours' END
    ELSE (window_hours / 24) || CASE WHEN (window_hours / 24) = 1 THEN ' day' ELSE ' days' END
END
WHERE window_label IS NULL;
