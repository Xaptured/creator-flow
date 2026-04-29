import browserAxiosClient from '@/lib/http/browserAxiosClient';
import { ConfirmUploadRequest, UploadUrlRequest } from '@/lib/request/media';
import { MediaFile, UploadUrlResponse } from '@/lib/response/media';

export async function requestUploadUrl(body: Omit<UploadUrlRequest, 'ownerId'>): Promise<UploadUrlResponse> {
  const { data } = await browserAxiosClient.post<UploadUrlResponse>(
    '/api/media/upload-url',
    body
  );
  return data;
}

export async function confirmUpload(body: Omit<ConfirmUploadRequest, 'ownerId'>): Promise<MediaFile> {
  const { data } = await browserAxiosClient.post<MediaFile>(
    '/api/media/confirm',
    body
  );
  return data;
}
