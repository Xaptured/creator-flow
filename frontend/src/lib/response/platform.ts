/**
 * Response shapes for platform connection status.
 * Mirror com.creatorflow.media_service.dto.response.PlatformStatusResponse
 */

import { PlatformType } from '@/lib/response/scheduler'

export interface PlatformStatusResponse {
  platform: PlatformType
  connected: boolean
  /** ISO-8601 string — present only when token is expired or near-expiry */
  tokenExpiry?: string
}

/**
 * Mirrors com.creatorflow.media_service.dto.response.DisconnectCheckResponse
 * scheduledCount > 0 means the user has scheduled posts on this platform
 * and should be warned before disconnecting.
 */
export interface DisconnectCheckResponse {
  scheduledCount: number
}
