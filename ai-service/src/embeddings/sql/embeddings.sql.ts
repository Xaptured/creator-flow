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
