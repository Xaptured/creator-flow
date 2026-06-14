/**
 * Response shapes returned by the Spring scheduler-service.
 * Mirror com.creatorflow.scheduler_service.dto.response.*
 */

export enum PlatformType {
  YOUTUBE = 'YOUTUBE',
  INSTAGRAM = 'INSTAGRAM',
  TWITTER = 'TWITTER',
}

export enum ContentStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

/** One entry per platform target from POST /schedule */
export interface ScheduleContentResponse {
  contentId: string | null
  platform: PlatformType
  status: string
  scheduledAt: string | null
  error?: string
}

export interface ContentCountResponse {
  count: number
}

/** From GET /content/{id}/status */
export interface ContentStatusResponse {
  contentId: string
  status: ContentStatus
  scheduledAt: string
  updatedAt: string
}

/** From GET /content — list endpoint */
export interface ScheduledContentSummary {
  id: string
  title: string
  platform: PlatformType
  status: ContentStatus
  scheduledAt: string
}

/** From GET /content/{id} — full details for edit mode */
export interface ScheduledContentDetail {
  id: string
  title: string
  description: string | null
  mediaFileId: string | null
  platformTargets: PlatformType[]
  status: ContentStatus
  scheduledAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * UI model — used across calendar components.
 * Identical shape to ScheduledContentSummary; kept as a named alias
 * so component props stay semantically clear at the call site.
 */
export interface ScheduledPost {
  id: string
  title: string
  platform: PlatformType
  status: ContentStatus
  scheduledAt: string
}
