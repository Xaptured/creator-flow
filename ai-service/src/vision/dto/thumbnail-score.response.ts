import { ThumbnailScoreStatus } from '../model/thumbnail-score.model.js';

/** One candidate frame with score, reasoning, and short-lived preview URL. */
export interface ThumbnailFrameDto {
  frameIndex: number;
  score: number;
  reasoning: string;
  /** Presigned GET URL (15 min) — present only when status is SCORED. */
  previewUrl: string;
}

export interface ThumbnailScoreResponse {
  mediaFileId: string;
  status: ThumbnailScoreStatus;
  frames: ThumbnailFrameDto[];
  error?: string;
}

export interface SelectThumbnailRequest {
  mediaFileId: string;
  frameIndex: number;
}

export interface SelectThumbnailResponse {
  mediaFileId: string;
  thumbnailS3Key: string;
}
