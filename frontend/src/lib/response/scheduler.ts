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

/** From GET /content/{id}/status */
export interface ContentStatusResponse {
  contentId: string
  status: ContentStatus
  scheduledAt: string
  updatedAt: string
}

/** From GET /content — list endpoint (GAP-1) */
export interface ScheduledContentSummary {
  id: string
  title: string
  platform: PlatformType
  status: ContentStatus
  scheduledAt: string
}

/**
 * UI model — used across calendar components.
 * Identical shape to ScheduledContentSummary; kept as a named alias
 * so component props stay semantically clear.
 */
export type ScheduledPost = ScheduledContentSummary
