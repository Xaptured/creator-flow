import browserAxiosClient from '@/lib/http/browserAxiosClient';
import { CaptionRequest, HashtagRequest } from '@/lib/request/ai';
import { CaptionResponse, HashtagResponse } from '@/lib/response/ai';
import { ConfirmUploadRequest, UploadUrlRequest } from '@/lib/request/media';
import { MediaFile, UploadUrlResponse } from '@/lib/response/media';
import { ScheduleContentRequest } from '@/lib/request/scheduler';
import { ScheduleContentResponse } from '@/lib/response/scheduler';

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

export async function scheduleContent(
  body: Omit<ScheduleContentRequest, 'ownerId'>
): Promise<ScheduleContentResponse[]> {
  const { data } = await browserAxiosClient.post<ScheduleContentResponse[]>(
    '/api/scheduler/schedule',
    body
  );
  return data;
}

export async function generateCaptions(
  body: Omit<CaptionRequest, 'ownerId'>
): Promise<CaptionResponse> {
  const { data } = await browserAxiosClient.post<CaptionResponse>('/api/ai/caption', body);
  return data;
}

export async function generateHashtags(
  body: Omit<HashtagRequest, 'ownerId'>
): Promise<HashtagResponse> {
  const { data } = await browserAxiosClient.post<HashtagResponse>('/api/ai/hashtags', body);
  return data;
}
