-- CF-96 Vision AI: selected thumbnail stored against the scheduled post.
-- Nullable — only YouTube video posts get a thumbnail; X/Instagram never set it.

ALTER TABLE content
    ADD COLUMN thumbnail_s3_key VARCHAR(1024);
