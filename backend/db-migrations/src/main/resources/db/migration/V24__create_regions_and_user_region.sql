-- V24: Create regions lookup table and users.region column (CF-95).
-- Region = geographic MARKET for trending (what's hot where).
-- Separate signal from users.timezone (V12), which drives best-time-to-post.
-- The dropdown set MUST equal the trending-refresh set: dropdown reads
-- regions WHERE is_active; refreshAll() iterates DISTINCT users.region ∪ default.
-- Mirrors niches (V14) / timezones (V16) lookup pattern; code is ISO 3166-1 alpha-2.

CREATE TABLE regions
(
    code          VARCHAR(8)   PRIMARY KEY,   -- ISO 3166-1 alpha-2 (US, GB, IN, ...)
    name          VARCHAR(100) NOT NULL,      -- display label ("United States")
    display_order SMALLINT     NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO regions (code, name, display_order) VALUES
    ('US', 'United States',  1),
    ('GB', 'United Kingdom', 2),
    ('IN', 'India',          3),
    ('CA', 'Canada',         4),
    ('AU', 'Australia',      5),
    ('DE', 'Germany',        6),
    ('BR', 'Brazil',         7);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS region VARCHAR(8) NOT NULL DEFAULT 'US'
        REFERENCES regions (code);
