
CREATE TABLE analytics_snapshots
(
    id          UUID PRIMARY KEY       DEFAULT gen_random_uuid(),
    content_id  UUID          NOT NULL REFERENCES content (id),
    platform    platform_type NOT NULL,
    views       BIGINT                 DEFAULT 0,
    likes       BIGINT                 DEFAULT 0,
    comments    BIGINT                 DEFAULT 0,
    snapshot_at TIMESTAMP     NOT NULL DEFAULT NOW()
);