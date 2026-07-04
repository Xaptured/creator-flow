export const UPSERT_EMBEDDING = `
  INSERT INTO content_embeddings (content_id, embedding, model)
  VALUES ($1, $2, $3)
  ON CONFLICT (content_id, model)
  DO UPDATE SET
    embedding  = EXCLUDED.embedding,
    updated_at = NOW()
  RETURNING id, content_id, embedding, model, created_at, updated_at
`;

export const FIND_SIMILAR = `
  SELECT content_id,
         embedding <=> $1 AS distance
  FROM   content_embeddings
  WHERE  model = $2
  ORDER  BY distance ASC
  LIMIT  $3
`;

export const DELETE_BY_CONTENT_ID = `
  DELETE FROM content_embeddings
  WHERE content_id = $1
`;

export const FIND_ONE = `
  SELECT id, content_id, embedding, model, created_at, updated_at
  FROM   content_embeddings
  WHERE  content_id = $1 AND model = $2
`;

/** Fetch the text used to build an embedding for a single content row. */
export const GET_CONTENT_TEXT = `
  SELECT id, title, description
  FROM   content
  WHERE  id = $1
`;

/**
 * Page through PUBLISHED content that has no embedding yet for the given model.
 * Used by the one-time backfill so historical content gets seeded.
 * $1 = model, $2 = limit, $3 = offset
 */
export const FIND_PUBLISHED_WITHOUT_EMBEDDING = `
  SELECT c.id, c.title, c.description
  FROM   content c
  WHERE  c.status = 'PUBLISHED'
    AND NOT EXISTS (
      SELECT 1 FROM content_embeddings ce
      WHERE ce.content_id = c.id AND ce.model = $1
    )
  ORDER  BY c.created_at ASC
  LIMIT  $2 OFFSET $3
`;
