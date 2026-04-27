CREATE TYPE media_status AS ENUM ('PENDING','UPLOADED','PROCESSING','READY','FAILED');

CREATE TABLE media_files
(
    id            UUID PRIMARY KEY       DEFAULT gen_random_uuid(),
    owner_id      UUID          NOT NULL REFERENCES users (id),
    s3_key        VARCHAR(1000) NOT NULL,
    original_name VARCHAR(500),
    mime_type     VARCHAR(100),
    size_bytes    BIGINT,
    status        media_status  NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);
