/**
 * Response shapes returned by the Spring media-service.
 * Mirror com.creatorflow.media_service.dto.response.*
 */

export enum MediaStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export interface MediaFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: MediaStatus;
  createdAt: string;
  readUrl: string | null;
}

export interface UploadUrlResponse {
  mediaId: string;
  presignedUrl: string;
  expiresAt: string;
}
