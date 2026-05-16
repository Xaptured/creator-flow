CREATE TYPE ig_container_status AS ENUM ('PENDING', 'PROCESSING', 'FINISHED', 'ERROR');

CREATE TABLE ig_container_tracking
(
    id           UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    content_id   UUID        NOT NULL UNIQUE REFERENCES content (id) ON DELETE CASCADE,
    owner_id     UUID        NOT NULL,
    container_id VARCHAR(255) NOT NULL,
    status       ig_container_status NOT NULL DEFAULT 'PENDING',
    error        TEXT,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ig_container_tracking_status
    ON ig_container_tracking (status)
    WHERE status IN ('PENDING', 'PROCESSING');
