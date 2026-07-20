/**
 * Server-side AI service calls.
 * Called from Next.js API routes only — never from components.
 * Uses the user's Keycloak Bearer token — ai-service validates it via JWKS.
 * ownerId is NOT sent in the request body — ai-service extracts it from the JWT sub claim.
 */
import axiosClient from '@/lib/http/axiosClient'
import { buildUrl } from '@/lib/http/serviceUrls'
import { CaptionRequest, HashtagRequest } from '@/lib/request/ai'
import { BestTimeResponse, CaptionResponse, ContentGap, HashtagResponse, InsightsResponse, TrendingPlatform } from '@/lib/response/ai'

function bearerHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` }
}

export async function getBestTime(
  accessToken: string,
  platform?: TrendingPlatform,
): Promise<BestTimeResponse> {
  const url = buildUrl('ai', '/api/ai/best-time')
  const { data } = await axiosClient.get<BestTimeResponse>(url, {
    headers: bearerHeaders(accessToken),
    ...(platform ? { params: { platform } } : {}),
  })
  return data
}

export async function getContentGaps(
  accessToken: string,
  platform?: TrendingPlatform,
): Promise<ContentGap[]> {
  const url = buildUrl('ai', '/api/ai/content-gaps')
  const { data } = await axiosClient.get<ContentGap[]>(url, {
    headers: bearerHeaders(accessToken),
    ...(platform ? { params: { platform } } : {}),
  })
  return data
}

export async function getAiInsights(accessToken: string): Promise<InsightsResponse> {
  const url = buildUrl('ai', '/api/ai/insights')
  const { data } = await axiosClient.get<InsightsResponse>(url, {
    headers: bearerHeaders(accessToken),
  })
  return data
}

export async function generateCaptions(
  body: Omit<CaptionRequest, 'ownerId'>,
  accessToken: string,
): Promise<CaptionResponse> {
  const url = buildUrl('ai', '/api/ai/caption')
  const { data } = await axiosClient.post<CaptionResponse>(url, body, {
    headers: bearerHeaders(accessToken),
  })
  return data
}

export async function generateHashtags(
  body: Omit<HashtagRequest, 'ownerId'>,
  accessToken: string,
): Promise<HashtagResponse> {
  const url = buildUrl('ai', '/api/ai/hashtags')
  const { data } = await axiosClient.post<HashtagResponse>(url, body, {
    headers: bearerHeaders(accessToken),
  })
  return data
}
