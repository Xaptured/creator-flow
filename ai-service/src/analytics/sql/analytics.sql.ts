export const GET_RECENT_SNAPSHOTS = `
  SELECT
    a.id,
    a.content_id,
    a.platform,
    a.views,
    a.likes,
    a.comments,
    a.snapshot_at
  FROM analytics_snapshots a
  JOIN content c ON c.id = a.content_id
  WHERE c.owner_id = $1
  ORDER BY a.snapshot_at DESC
  LIMIT 10
`;

export const GET_TOP_POSTS = `
  SELECT DISTINCT ON (a.content_id)
    a.id,
    a.content_id,
    a.platform,
    a.views,
    a.likes,
    a.comments,
    a.snapshot_at
  FROM analytics_snapshots a
  JOIN content c ON c.id = a.content_id
  WHERE c.owner_id = $1
  ORDER BY a.content_id, a.snapshot_at DESC, (a.views + a.likes + a.comments) DESC
  LIMIT 10
`;
