CREATE TYPE content_status AS ENUM ('DRAFT','SCHEDULED','PUBLISHING','PUBLISHED','FAILED');
CREATE TYPE platform_type AS ENUM ('YOUTUBE','INSTAGRAM','TWITTER');

CREATE TABLE content
(
    id               UUID PRIMARY KEY        DEFAULT gen_random_uuid(),
    owner_id         UUID           NOT NULL REFERENCES users (id),
    title            VARCHAR(500)   NOT NULL,
    description      TEXT,
    status           content_status NOT NULL DEFAULT 'DRAFT',
    platform_targets JSONB,
    scheduled_at     TIMESTAMP,
    created_at       TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_accounts
(
    id            UUID PRIMARY KEY       DEFAULT gen_random_uuid(),
    owner_id      UUID          NOT NULL REFERENCES users (id),
    platform      platform_type NOT NULL,
    access_token  TEXT          NOT NULL,
    refresh_token TEXT,
    expires_at    TIMESTAMP,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (owner_id, platform)
);
