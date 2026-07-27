/**
 * Payload of the `MEDIA_VIDEO_UPLOADED` event published by media-service to the
 * media-events SNS topic when a video/mp4 upload is confirmed (CF-96).
 * Matches media-service's VideoUploadedPayload DTO.
 */
export interface VideoUploadedEvent {
  mediaId: string;
  ownerId: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  confirmedAt: string;
}

export const EVENT_VIDEO_UPLOADED = 'MEDIA_VIDEO_UPLOADED';
export const EVENT_ANALYTICS_UPDATED = 'analytics.updated';
