-- V14: Create niches lookup table
-- Stores the canonical list of content niche categories.
-- display_order controls the order returned to the frontend.
-- is_active allows soft-disabling a niche without breaking existing user rows.

CREATE TABLE niches
(
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    display_order SMALLINT     NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO niches (name, display_order) VALUES
    ('Gaming',       1),
    ('Photography',  2),
    ('Tech',         3),
    ('Lifestyle',    4),
    ('Travel',       5),
    ('Fitness',      6),
    ('Food',         7),
    ('Education',    8),
    ('Business',     9),
    ('Art & Design', 10),
    ('Other',        11);
