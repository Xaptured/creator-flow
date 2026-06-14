import axiosClient from '@/lib/http/axiosClient'
import { buildUrl } from '@/lib/http/serviceUrls'
import { ContentSnapshot, PlatformSummary, TopPost } from '@/lib/response/analytics'

function bearerHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` }
}

export async function getSummary(
  ownerId: string,
  accessToken: string,
  platform?: string,
): Promise<PlatformSummary[]> {
  const query = platform ? { platform } : undefined
  const url = buildUrl('analytics', '/v1.0/api/analytics/summary/:ownerId', { ownerId }, query)
  const { data } = await axiosClient.get<PlatformSummary[]>(url, {
    headers: bearerHeaders(accessToken),
  })
  return data
}

export async function getTopPosts(
  ownerId: string,
  accessToken: string,
  platform?: string,
): Promise<TopPost[]> {
  const query = platform ? { platform } : undefined
  const url = buildUrl('analytics', '/v1.0/api/analytics/top-posts/:ownerId', { ownerId }, query)
  const { data } = await axiosClient.get<TopPost[]>(url, {
    headers: bearerHeaders(accessToken),
  })
  return data
}

export async function getContentHistory(
  contentId: string,
  ownerId: string,
  accessToken: string,
): Promise<ContentSnapshot[]> {
  const url = buildUrl(
    'analytics',
    '/v1.0/api/analytics/content/:contentId',
    { contentId },
    { ownerId },
  )
  const { data } = await axiosClient.get<ContentSnapshot[]>(url, {
    headers: bearerHeaders(accessToken),
  })
  return data
}
