/**
 * Media API functions — called from Next.js API routes (server-side only).
 * All calls go to Spring media-service via axiosClient.
 */

import axiosClient from '@/lib/http/axiosClient';
import { buildUrl } from '@/lib/http/serviceUrls';
import { ConfirmUploadRequest, UploadUrlRequest } from '@/lib/request/media';
import { MediaFile, UploadUrlResponse } from '@/lib/response/media';

/**
 * Request a presigned S3 PUT URL from media-service.
 * POST /v1.0/api/media/upload-url
 */
export async function requestUploadUrl(
  body: UploadUrlRequest,
  accessToken: string
): Promise<UploadUrlResponse> {
  const url = buildUrl('media', '/v1.0/api/media/upload-url');
  const { data } = await axiosClient.post<UploadUrlResponse>(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Confirm upload — marks media_files record as UPLOADED.
 * POST /v1.0/api/media/confirm
 */
export async function confirmUpload(
  body: ConfirmUploadRequest,
  accessToken: string
): Promise<MediaFile> {
  const url = buildUrl('media', '/v1.0/api/media/confirm');
  const { data } = await axiosClient.post<MediaFile>(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Fetch media file metadata + fresh presigned GET URL.
 * GET /v1.0/api/media/:id?ownerId=...
 *
 * ownerId injected server-side by the Next.js route from session — never supplied by the browser client.
 */
export async function getMediaFile(
  mediaId: string,
  ownerId: string,
  accessToken: string
): Promise<MediaFile> {
  const url = buildUrl('media', '/v1.0/api/media/:id', { id: mediaId }, { ownerId });
  const { data } = await axiosClient.get<MediaFile>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}
