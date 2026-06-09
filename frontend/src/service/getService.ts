import browserAxiosClient from '@/lib/http/browserAxiosClient';
import { InsightsResponse } from '@/lib/response/ai';
import { MediaFile } from '@/lib/response/media';
import { ContentStatusResponse, ScheduledContentDetail, ScheduledPost } from '@/lib/response/scheduler';
import { DisconnectCheckResponse, PlatformStatusResponse } from '@/lib/response/platform';
import { NichesResponse, TimezonesResponse, UserPreferencesResponse } from '@/lib/response/user';

export async function getMediaFile(mediaId: string): Promise<MediaFile> {
  const { data } = await browserAxiosClient.get<MediaFile>(`/api/media/${mediaId}`);
  return data;
}

export async function getMediaFiles(): Promise<MediaFile[]> {
  const { data } = await browserAxiosClient.get<MediaFile[]>('/api/media');
  return data;
}

export async function getScheduledContent(): Promise<ScheduledPost[]> {
  const { data } = await browserAxiosClient.get<ScheduledPost[]>('/api/scheduler/content');
  return data;
}

export async function getContentStatus(contentId: string): Promise<ContentStatusResponse> {
  const { data } = await browserAxiosClient.get<ContentStatusResponse>(
    `/api/scheduler/content/${contentId}/status`
  );
  return data;
}

export async function getScheduledContentDetail(contentId: string): Promise<ScheduledContentDetail> {
  const { data } = await browserAxiosClient.get<ScheduledContentDetail>(
    `/api/scheduler/content/${contentId}`
  );
  return data;
}

export async function getPlatformStatus(): Promise<PlatformStatusResponse[]> {
  const { data } = await browserAxiosClient.get<PlatformStatusResponse[]>('/api/platforms/status');
  return data;
}

/**
 * Checks whether disconnecting a platform will affect scheduled posts.
 * Returns { scheduledCount: N } — a count > 0 means a warning dialog should be shown.
 */
export async function checkDisconnect(platform: string): Promise<DisconnectCheckResponse> {
  const { data } = await browserAxiosClient.get<DisconnectCheckResponse>(
    `/api/platforms/disconnect-check?platform=${platform}`
  );
  return data;
}

export async function getUserPreferences(): Promise<UserPreferencesResponse> {
  const { data } = await browserAxiosClient.get<UserPreferencesResponse>('/api/user/preferences');
  return data;
}

export async function getNiches(): Promise<NichesResponse> {
  const { data } = await browserAxiosClient.get<NichesResponse>('/api/user/niches');
  return data;
}

export async function getTimezones(): Promise<TimezonesResponse> {
  const { data } = await browserAxiosClient.get<TimezonesResponse>('/api/user/timezones');
  return data;
}

export async function getAiInsights(): Promise<InsightsResponse> {
  const { data } = await browserAxiosClient.get<InsightsResponse>('/api/ai/insights');
  return data;
}
