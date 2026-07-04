-- CF-95 follow-up: separate "goes public" time from the publish-trigger time.
--
-- content.scheduled_at drives the PublishJob (content publishes when
-- scheduled_at <= now). For YouTube the video is UPLOADED immediately but goes
-- public later (the creator-entered "go live" time in YouTube Studio). That
-- go-live time is the correct T=0 anchor for analytics metric-fetch scheduling,
-- and cannot live in scheduled_at without delaying the upload.
--
-- live_at holds that go-live instant. For Twitter/Instagram it stays NULL —
-- those go live at publish time, so analytics falls back to scheduled_at.
ALTER TABLE content
    ADD COLUMN IF NOT EXISTS live_at TIMESTAMP WITH TIME ZONE;
