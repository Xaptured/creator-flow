/**
 * PER-PLATFORM max-of-min cosine distance gap detection.
 *
 * For each trending topic in the creator's niche, find the SMALLEST distance to
 * any of the creator's content embeddings ON THAT TOPIC'S PLATFORM (its nearest
 * covered match). Topics whose nearest same-platform match is FARTHEST — or that
 * have NO content on that platform at all — are the biggest gaps.
 *
 * Platform attribution: content.platform_targets is a JSONB array (e.g.
 * ["YOUTUBE"]); the composer writes exactly one platform per row, and the `@>`
 * containment check also handles multi-target rows correctly if they ever occur.
 *
 * LEFT JOIN + COALESCE(…, 1) is load-bearing: an INNER JOIN would silently DROP
 * topics on platforms where the creator has no content — the exact topics that
 * are the biggest gaps. COALESCE pins them to distance 1 (fully uncovered).
 * Ties (multiple fully-uncovered topics) are broken by freshness.
 *
 * $1 model, $2 ownerId, $3 creator niche, $4 optional platform (NULL = all),
 * $5 creator region (region-scoped rows match it; IG 'GLOBAL' rows always match),
 * $6 freshness window in hours.
 */
export const FIND_GAPS = `
  SELECT t.topic,
         t.platform,
         COALESCE(MIN(t.embedding <=> ce.embedding), 1) AS nearest_distance
  FROM   trending_topics t
  LEFT JOIN content c
         ON c.owner_id = $2
        AND c.platform_targets @> to_jsonb(t.platform::text)
  LEFT JOIN content_embeddings ce
         ON ce.content_id = c.id
        AND ce.model = $1
  WHERE  t.model = $1
    AND  t.niche = $3
    AND  ($4::platform_type IS NULL OR t.platform = $4::platform_type)
    AND  (t.region = $5 OR t.region = 'GLOBAL')
    AND  t.fetched_at > NOW() - make_interval(hours => $6)
  GROUP  BY t.topic, t.platform
  ORDER  BY nearest_distance DESC, MAX(t.fetched_at) DESC
  LIMIT  5
`;

/**
 * Empty-catalogue fallback: freshest niche topics, everything is a gap.
 * With the LEFT-JOIN main query this only fires when the creator has no
 * embeddings AND ordering-by-freshness is preferred over the all-tied-at-1
 * distance ordering. Kept for that ordering + as a safety net.
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
