-- V11: Add timezone column to users table
-- Stores IANA timezone string (e.g. 'UTC', 'Asia/Kolkata')
-- Defaults to UTC so existing rows are unaffected

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'UTC';
