import browserAxiosClient from '@/lib/http/browserAxiosClient';
import { InsightsResponse } from '@/lib/response/ai';
import { MediaFile } from '@/lib/response/media';
import { ContentCountResponse, ContentStatusResponse, ScheduledContentDetail, ScheduledPost } from '@/lib/response/scheduler';
import { PlatformSummary, TopPost, ContentSnapshot } from '@/lib/response/analytics';
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

export async function getAnalyticsSummary(platform?: string): Promise<PlatformSummary[]> {
  const url = platform
    ? `/api/analytics/summary?platform=${encodeURIComponent(platform)}`
    : '/api/analytics/summary';
  const { data } = await browserAxiosClient.get<PlatformSummary[]>(url);
  return data;
}

export async function getTopPosts(platform?: string): Promise<TopPost[]> {
  const url = platform
    ? `/api/analytics/top-posts?platform=${encodeURIComponent(platform)}`
    : '/api/analytics/top-posts';
  const { data } = await browserAxiosClient.get<TopPost[]>(url);
  return data;
}

export async function getContentHistory(contentId: string): Promise<ContentSnapshot[]> {
  const { data } = await browserAxiosClient.get<ContentSnapshot[]>(
    `/api/analytics/content/${contentId}`
  );
  return data;
}

export async function getScheduledCount(status = 'SCHEDULED'): Promise<ContentCountResponse> {
  const { data } = await browserAxiosClient.get<ContentCountResponse>(
    `/api/scheduler/content/count?status=${encodeURIComponent(status)}`
  );
  return data;
}
