/**
 * SQL for the thumbnail_scores table (migration V10, db-migrations service).
 * One row per media file; UNIQUE(media_file_id) gives SQS idempotency.
 */

export const INSERT_PENDING = `
  INSERT INTO thumbnail_scores (id, media_file_id, owner_id, media_s3_key, status, created_at, updated_at)
  VALUES ($1, $2, $3, $4, 'PENDING', now(), now())
  ON CONFLICT (media_file_id) DO NOTHING
  RETURNING id
`;

/** Re-arm a FAILED row for retry. Returns nothing if the row is not FAILED. */
export const RESET_FAILED_TO_PENDING = `
  UPDATE thumbnail_scores
  SET status = 'PENDING', error = NULL, updated_at = now()
  WHERE media_file_id = $1 AND status = 'FAILED'
  RETURNING id
`;

export const MARK_EXTRACTING = `
  UPDATE thumbnail_scores
  SET status = 'EXTRACTING', updated_at = now()
  WHERE media_file_id = $1
`;

export const MARK_SCORED = `
  UPDATE thumbnail_scores
  SET status = 'SCORED', frames = $2::jsonb, error = NULL, updated_at = now()
  WHERE media_file_id = $1
`;

export const MARK_FAILED = `
  UPDATE thumbnail_scores
  SET status = 'FAILED', error = $2, updated_at = now()
  WHERE media_file_id = $1
`;

export const FIND_BY_MEDIA_AND_OWNER = `
  SELECT media_file_id, owner_id, media_s3_key, status, frames, error, updated_at
  FROM thumbnail_scores
  WHERE media_file_id = $1 AND owner_id = $2
`;
