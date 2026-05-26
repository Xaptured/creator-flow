-- CF-102: Store platform-native post ID on content record.
-- Nullable — only populated after a successful platform publish.
ALTER TABLE content ADD COLUMN platform_post_id VARCHAR(255);
