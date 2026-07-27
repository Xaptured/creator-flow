-- CF-96 Vision AI: thumbnail scoring results (one row per media file).
-- Written/read by ai-service (raw SQL). Idempotency: UNIQUE(media_file_id)
-- lets the SQS consumer skip duplicate MEDIA_VIDEO_UPLOADED deliveries.
-- frames JSONB shape: [{"frameIndex": 0, "s3Key": "...", "score": 8, "reasoning": "..."}]

CREATE TYPE thumbnail_score_status AS ENUM ('PENDING', 'EXTRACTING', 'SCORED', 'FAILED');

CREATE TABLE thumbnail_scores (
    id            UUID PRIMARY KEY,
    media_file_id UUID NOT NULL UNIQUE,
    owner_id      UUID NOT NULL,
    media_s3_key  VARCHAR(1024) NOT NULL,
    status        thumbnail_score_status NOT NULL,
    frames        JSONB,
    error         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_thumbnail_scores_owner ON thumbnail_scores (owner_id);
