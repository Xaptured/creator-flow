/**
 * Request body shapes sent to the Spring media-service.
 * Mirror com.creatorflow.media_service.dto.request.*
 *
 * ownerId is always injected server-side by Next.js routes from session.
 * Client-side code uses Omit<*, 'ownerId'> — never sends ownerId from the browser.
 */

export interface UploadUrlRequest {
  ownerId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ConfirmUploadRequest {
  ownerId: string;
  mediaId: string;
}
