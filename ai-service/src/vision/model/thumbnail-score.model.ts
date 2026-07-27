export type ThumbnailScoreStatus =
  | 'PENDING'
  | 'EXTRACTING'
  | 'SCORED'
  | 'FAILED';

/** One scored frame as persisted in thumbnail_scores.frames JSONB. */
export interface ScoredFrame {
  frameIndex: number;
  s3Key: string;
  score: number;
  reasoning: string;
}

/** Row shape returned by pg for thumbnail_scores queries. */
export interface ThumbnailScoreRow {
  media_file_id: string;
  owner_id: string;
  media_s3_key: string;
  status: ThumbnailScoreStatus;
  frames: ScoredFrame[] | null;
  error: string | null;
  updated_at: Date;
}
