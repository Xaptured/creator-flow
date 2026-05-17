import axiosClient from '@/lib/http/axiosClient';
import { buildUrl } from '@/lib/http/serviceUrls';
import { ConfirmUploadRequest, UploadUrlRequest } from '@/lib/request/media';
import { MediaFile, UploadUrlResponse } from '@/lib/response/media';

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

export async function listMediaFiles(
  ownerId: string,
  accessToken: string
): Promise<MediaFile[]> {
  const url = buildUrl('media', '/v1.0/api/media', undefined, { ownerId });
  const { data } = await axiosClient.get<MediaFile[]>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

export async function deleteMediaFile(
  mediaId: string,
  ownerId: string,
  accessToken: string
): Promise<void> {
  const url = buildUrl('media', '/v1.0/api/media/:id', { id: mediaId }, { ownerId });
  await axiosClient.delete(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
