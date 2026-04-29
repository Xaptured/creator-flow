import browserAxiosClient from '@/lib/http/browserAxiosClient';
import { MediaFile } from '@/lib/response/media';

/**
 * GET calls to Next.js API routes.
 * All functions call internal /api/* routes — auth handled server-side in those routes.
 */

/**
 * Fetches media file metadata and a fresh presigned S3 read URL (1-hour expiry).
 * GET /api/media/:id
 *
 * ownerId is injected server-side from the session in the Next.js route — not sent by the client.
 *
 * @param mediaId - UUID of the media_files record
 */
export async function getMediaFile(mediaId: string): Promise<MediaFile> {
  const { data } = await browserAxiosClient.get<MediaFile>(`/api/media/${mediaId}`);
  return data;
}
