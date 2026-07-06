/**
 * Max-of-min cosine distance gap detection.
 *
 * For each trending topic in the creator's niche, find the SMALLEST distance to
 * ANY of the creator's content embeddings (its nearest covered match). Return the
 * topics whose nearest match is FARTHEST = least covered = the biggest gap.
 *
 * NOTE: `ORDER BY embedding <=> $1 LIMIT 5` (the ticket's suggestion) returns the
 * MOST-covered topics — the exact opposite of a gap. Hence MIN + ORDER BY DESC.
 *
 * $1 model, $2 ownerId, $3 creator niche, $4 optional platform (NULL = all),
 * $5 creator region (region-scoped rows match it; IG 'GLOBAL' rows always match),
 * $6 freshness window in hours.
 *
 * Both tables MUST be pinned to the same embedding model ($1) — distances across
 * different models are meaningless.
 */
export const FIND_GAPS = `
  SELECT t.topic,
         t.platform,
         MIN(t.embedding <=> ce.embedding) AS nearest_distance
  FROM   trending_topics t
  JOIN   content_embeddings ce ON ce.model = $1
  JOIN   content c             ON c.id = ce.content_id AND c.owner_id = $2
  WHERE  t.model = $1
    AND  t.niche = $3
    AND  ($4::platform_type IS NULL OR t.platform = $4::platform_type)
    AND  (t.region = $5 OR t.region = 'GLOBAL')
    AND  t.fetched_at > NOW() - make_interval(hours => $6)
  GROUP  BY t.topic, t.platform
  ORDER  BY nearest_distance DESC
  LIMIT  5
`;

/**
 * Empty-catalogue fallback: a creator with zero embeddings joins to nothing in
 * FIND_GAPS. Everything trending in their niche is a gap — return the freshest.
 * $1 model, $2 niche, $3 optional platform, $4 region, $5 freshness hours.
 */
export const FIND_FALLBACK_TOPICS = `
  SELECT t.topic,
         t.platform
  FROM   trending_topics t
  WHERE  t.model = $1
    AND  t.niche = $2
    AND  ($3::platform_type IS NULL OR t.platform = $3::platform_type)
    AND  (t.region = $4 OR t.region = 'GLOBAL')
    AND  t.fetched_at > NOW() - make_interval(hours => $5)
  GROUP  BY t.topic, t.platform
  ORDER  BY MAX(t.fetched_at) DESC
  LIMIT  5
`;

/** Whether the creator has any content embeddings for the given model. */
export const HAS_ANY_EMBEDDING = `
  SELECT 1
  FROM   content_embeddings ce
  JOIN   content c ON c.id = ce.content_id
  WHERE  c.owner_id = $1 AND ce.model = $2
  LIMIT  1
`;
