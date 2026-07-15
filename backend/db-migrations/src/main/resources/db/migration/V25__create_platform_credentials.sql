-- V25: Create platform_credentials table (CF-95 trending — IG token auto-refresh).
-- Stores APP-LEVEL platform credentials that must survive restarts and be
-- rotatable at runtime (e.g. the Meta long-lived token used for ig_hashtag_search,
-- which expires after ~60 days and is re-exchanged weekly by ai-service).
--
-- NOT for per-creator OAuth tokens — those live in platform_accounts.
-- Values are secrets: never log them, never expose via any API response.

CREATE TABLE platform_credentials
(
    credential_key VARCHAR(64)  PRIMARY KEY,   -- e.g. 'IG_APP_ACCESS_TOKEN'
    value          TEXT         NOT NULL,
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);
