CREATE TABLE youtube_channels
(
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_account_id  UUID         NOT NULL REFERENCES platform_accounts (id) ON DELETE CASCADE,
    owner_id             UUID         NOT NULL REFERENCES users (id),
    channel_id           VARCHAR(255) NOT NULL,
    channel_name         VARCHAR(500) NOT NULL,
    channel_thumbnail    TEXT,
    subscriber_count     BIGINT       NOT NULL DEFAULT 0,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (platform_account_id)
);

CREATE INDEX idx_youtube_channels_owner_id ON youtube_channels (owner_id);
