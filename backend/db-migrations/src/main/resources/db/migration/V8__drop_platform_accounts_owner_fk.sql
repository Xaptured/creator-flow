-- owner_id is a Keycloak UUID (JWT sub claim) — no local users table row is created on login.
-- The FK to users was incorrect for this identity model and is dropped from both tables here.
ALTER TABLE platform_accounts DROP CONSTRAINT platform_accounts_owner_id_fkey;
ALTER TABLE youtube_channels DROP CONSTRAINT youtube_channels_owner_id_fkey;
