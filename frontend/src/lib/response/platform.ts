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
