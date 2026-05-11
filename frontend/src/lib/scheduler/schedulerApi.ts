/**
 * Server-side scheduler-service client.
 * Called only from Next.js BFF API routes — never from components.
 * Uses axiosClient (with retry) and injects Bearer token on every call.
 */

import axiosClient from '@/lib/http/axiosClient'
import { buildUrl } from '@/lib/http/serviceUrls'
import { RescheduleContentRequest, ScheduleContentRequest } from '@/lib/request/scheduler'
import {
  ContentStatusResponse,
  ScheduleContentResponse,
  ScheduledContentSummary,
} from '@/lib/response/scheduler'

export async function scheduleContent(
  body: ScheduleContentRequest,
  accessToken: string
): Promise<ScheduleContentResponse[]> {
  const url = buildUrl('scheduler', '/v1.0/api/scheduler/schedule')
  const { data } = await axiosClient.post<ScheduleContentResponse[]>(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}

export async function listScheduledContent(
  ownerId: string,
  accessToken: string
): Promise<ScheduledContentSummary[]> {
  const url = buildUrl('scheduler', '/v1.0/api/scheduler/content', undefined, { ownerId })
  console.log('URL', url)
  const { data } = await axiosClient.get<ScheduledContentSummary[]>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}

export async function getContentStatus(
  contentId: string,
  ownerId: string,
  accessToken: string
): Promise<ContentStatusResponse> {
  const url = buildUrl(
    'scheduler',
    '/v1.0/api/scheduler/content/:id/status',
    { id: contentId },
    { ownerId }
  )
  const { data } = await axiosClient.get<ContentStatusResponse>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data
}

export async function rescheduleContent(
  contentId: string,
  body: RescheduleContentRequest,
  accessToken: string
): Promise<void> {
  const url = buildUrl('scheduler', '/v1.0/api/scheduler/content/:id/reschedule', {
    id: contentId,
  })
  await axiosClient.patch(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
