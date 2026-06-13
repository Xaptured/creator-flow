export const GET_RECENT_SNAPSHOTS = `
  SELECT
    a.id,
    a.content_id,
    a.platform,
    a.views,
    a.likes,
    a.comments,
    a.fetched_at AS snapshot_at
  FROM analytics_snapshots a
  WHERE a.owner_id = $1
  ORDER BY a.fetched_at DESC
  LIMIT 30
`;

export const GET_TOP_POSTS = `
  SELECT DISTINCT ON (a.content_id)
    a.id,
    a.content_id,
    a.platform,
    a.views,
    a.likes,
    a.comments,
    a.fetched_at AS snapshot_at
  FROM analytics_snapshots a
  WHERE a.owner_id = $1
  ORDER BY a.content_id, a.fetched_at DESC, (a.views + a.likes + a.comments) DESC
`;
