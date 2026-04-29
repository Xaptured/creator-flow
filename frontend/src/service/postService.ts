import browserAxiosClient from '@/lib/http/browserAxiosClient';
import { ConfirmUploadRequest, UploadUrlRequest } from '@/lib/request/media';
import { MediaFile, UploadUrlResponse } from '@/lib/response/media';

/**
 * POST calls to Next.js API routes.
 * All functions call internal /api/* routes — auth handled server-side in those routes.
 */

/**
 * Requests a presigned S3 PUT URL from media-service via the Next.js API route.
 * POST /api/media/upload-url
 *
 * @returns mediaId (to use in confirm step) and presignedUrl (to PUT the file to S3)
 */
export async function requestUploadUrl(body: Omit<UploadUrlRequest, 'ownerId'>): Promise<UploadUrlResponse> {
  const { data } = await browserAxiosClient.post<UploadUrlResponse>(
    '/api/media/upload-url',
    body
  );
  return data;
}

/**
 * Confirms a completed S3 upload — marks the media_files record as UPLOADED.
 * POST /api/media/confirm
 *
 * Call this after uploadToS3 resolves successfully.
 */
export async function confirmUpload(body: Omit<ConfirmUploadRequest, 'ownerId'>): Promise<MediaFile> {
  const { data } = await browserAxiosClient.post<MediaFile>(
    '/api/media/confirm',
    body
  );
  return data;
}
