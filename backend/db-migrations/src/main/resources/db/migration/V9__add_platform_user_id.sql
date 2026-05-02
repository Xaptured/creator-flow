-- V9: Add platform_user_id to platform_accounts
-- Stores the platform's native user ID (Instagram user_id, Twitter user_id).
-- Nullable — existing YouTube rows have no platform user ID (YouTube uses channel info separately).
-- Used by InstagramPublishService to call /me/media and /me/media_publish endpoints.

ALTER TABLE platform_accounts
    ADD COLUMN platform_user_id VARCHAR(255);
