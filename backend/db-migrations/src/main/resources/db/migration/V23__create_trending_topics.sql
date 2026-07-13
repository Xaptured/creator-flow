-- V23: Create trending_topics table (CF-95 content gap detection).
-- Global table — no owner_id. One row per (platform, topic, region).
-- Topics are Claude-normalized phrases, embedded with the SAME model as
-- content_embeddings so cosine distances between the two tables are valid.
-- Region: ISO 3166-1 alpha-2 for YouTube/X rows; Instagram rows use 'GLOBAL'
-- (ig_hashtag_search has no region parameter).

CREATE TABLE trending_topics
(
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    platform    platform_type NOT NULL,                -- YOUTUBE | INSTAGRAM | TWITTER
    topic       VARCHAR(500)  NOT NULL,                -- Claude-normalized clean topic
    source_ref  VARCHAR(255),                          -- youtube videoId / hashtag / trend name
    niche       VARCHAR(100)  NOT NULL,                -- canonical niches.name (matches users.niche)
    embedding   vector(1536)  NOT NULL,
    model       VARCHAR(128)  NOT NULL,
    region      VARCHAR(8)    NOT NULL DEFAULT 'US',
    fetched_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (platform, topic, region)
);

-- HNSW index for fast approximate nearest-neighbour with cosine distance.
CREATE INDEX trending_topics_embedding_hnsw_idx
    ON trending_topics
    USING hnsw (embedding vector_cosine_ops);

-- Gap query filters by platform + niche + region before the vector join.
CREATE INDEX trending_topics_platform_niche_region_idx
    ON trending_topics (platform, niche, region);
