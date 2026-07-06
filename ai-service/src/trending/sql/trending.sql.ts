/**
 * Idempotent upsert — UNIQUE(platform, topic, region) makes refresh re-runnable.
 * Never truncates: a failed refresh leaves last-good rows in place; staleness is
 * handled by the freshness filter in the gap query.
 */
export const UPSERT_TRENDING_TOPIC = `
  INSERT INTO trending_topics (platform, topic, source_ref, niche, embedding, model, region)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (platform, topic, region)
  DO UPDATE SET
    source_ref = EXCLUDED.source_ref,
    niche      = EXCLUDED.niche,
    embedding  = EXCLUDED.embedding,
    model      = EXCLUDED.model,
    fetched_at = NOW()
  RETURNING id
`;

/**
 * Regions the refresh must cover: every region actually chosen by a user.
 * The configured default region is unioned in at the service layer.
 */
export const GET_REGIONS_IN_USE = `
  SELECT DISTINCT region
  FROM   users
  WHERE  region IS NOT NULL
`;

/**
 * Creator's niche + region, resolved server-side (never from the client).
 * ownerId = JWT sub = Keycloak UUID = users.keycloak_id (NOT users.id, which
 * is an independent internal UUID).
 */
export const GET_USER_NICHE_REGION = `
  SELECT niche, region
  FROM   users
  WHERE  keycloak_id = $1
`;

/** True if the region code exists and is active in the regions lookup. */
export const IS_ACTIVE_REGION = `
  SELECT 1
  FROM   regions
  WHERE  code = $1 AND is_active
`;
