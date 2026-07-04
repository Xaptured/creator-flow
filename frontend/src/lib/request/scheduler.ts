/**
 * Inbound request bodies for the scheduler BFF routes.
 * Mirror com.creatorflow.scheduler_service.dto.request.*
 *
 * ownerId is always Omit-ted at the client boundary — injected server-side
 * by each BFF route from session.userId.
 */

import { PlatformType } from '@/lib/response/scheduler'

export interface ScheduleContentRequest {
  ownerId: string
  title: string
  description?: string
  mediaFileId?: string
  platformTargets: PlatformType[]
  /** ISO-8601 string. Omit for instant publish (backend defaults to now). */
  scheduledAt?: string
  /** ISO-8601 string. YouTube only — when the video goes public (analytics anchor). */
  liveAt?: string
}

export interface RescheduleContentRequest {
  ownerId: string
  /** ISO-8601 string — new scheduled time. */
  scheduledAt: string
}

export interface UpdateContentRequest {
  ownerId: string
  title: string
  description?: string
  mediaFileId?: string
  platformTargets: PlatformType[]
  /** ISO-8601 string — new scheduled time. */
  scheduledAt?: string
  /** ISO-8601 string. YouTube only — when the video goes public (analytics anchor). */
  liveAt?: string
}
