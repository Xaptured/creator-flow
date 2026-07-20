/**
 * Best-time-to-post bucketing (CF-95 Day 4).
 *
 * Latest snapshot per (content, platform) — a post has up to 3 window
 * snapshots (72h/7d/30d); raw AVG over all of them would over-weight posts
 * with more windows. The latest window is the most complete picture.
 *
 * Time anchor: COALESCE(live_at, scheduled_at) — live_at is the real YouTube
 * go-live instant (V22); IG/X go live at scheduled_at (live_at stays NULL).
 *
 * Buckets: day-of-week (0=Sun..6=Sat) × 3-hour block (0,3,..21), computed in
 * the CREATOR'S timezone (users.timezone, V12) — "post at 6 PM" must mean
 * their 6 PM. ⚠ users join is on keycloak_id (owner_id = JWT sub), NOT users.id.
 *
 * Engagement: engagement_rate when present, else (likes+comments)/views so
 * young snapshots aren't silently dropped.
 *
 * $1 ownerId (Keycloak UUID), $2 optional platform (NULL = all platforms)
 */
export const BEST_TIME_BUCKETS = `
  WITH latest AS (
    SELECT DISTINCT ON (a.content_id, a.platform)
           a.content_id,
           a.platform,
           COALESCE(a.engagement_rate,
                    (a.likes + a.comments)::numeric / NULLIF(a.views, 0)) AS engagement,
           COALESCE(c.live_at, c.scheduled_at) AS posted_at,
           u.timezone
    FROM   analytics_snapshots a
    JOIN   content c ON c.id = a.content_id
    JOIN   users   u ON u.keycloak_id = a.owner_id::text
    WHERE  a.owner_id = $1
      AND  ($2::platform_type IS NULL OR a.platform = $2::platform_type)
      AND  COALESCE(c.live_at, c.scheduled_at) IS NOT NULL
    ORDER  BY a.content_id, a.platform, a.fetched_at DESC
  )
  SELECT EXTRACT(DOW  FROM posted_at AT TIME ZONE timezone)::int            AS dow,
         ((EXTRACT(HOUR FROM posted_at AT TIME ZONE timezone)::int) / 3) * 3 AS hour_block,
         AVG(engagement)                                                     AS avg_engagement,
         COUNT(*)                                                            AS sample_size
  FROM   latest
  WHERE  engagement IS NOT NULL
  GROUP  BY dow, hour_block
  ORDER  BY avg_engagement DESC NULLS LAST
`;

/** Creator's IANA timezone for response labelling. ownerId = keycloak_id. */
export const GET_USER_TIMEZONE = `
  SELECT timezone
  FROM   users
  WHERE  keycloak_id = $1
`;
