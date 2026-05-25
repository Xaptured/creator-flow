-- V17: Enable pgvector extension and create content_embeddings table.
-- Stores embedding vectors for content rows to enable semantic similarity search.
-- Uses cosine distance operator (<=> from pgvector) for nearest-neighbour queries.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE content_embeddings
(
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id  UUID        NOT NULL REFERENCES content (id) ON DELETE CASCADE,
    embedding   vector(1536) NOT NULL,
    model       VARCHAR(128) NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (content_id, model)
);

-- HNSW index for fast approximate nearest-neighbour with cosine distance.
CREATE INDEX content_embeddings_embedding_hnsw_idx
    ON content_embeddings
    USING hnsw (embedding vector_cosine_ops);
