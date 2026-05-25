export const INSERT_SNAPSHOT = `
  INSERT INTO analytics_snapshots (content_id, platform, views, likes, comments, snapshot_at)
  VALUES ($1, $2::platform_type, $3, $4, $5, COALESCE($6::timestamptz, NOW()))
  RETURNING id, content_id, platform, views, likes, comments, snapshot_at
`;
