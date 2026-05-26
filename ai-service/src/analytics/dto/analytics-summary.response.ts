import { AnalyticsSnapshot } from '../model/snapshot.model.js';

/**
 * Response shape for GET /analytics/summary/:ownerId.
 *
 * Returns the 30-day analytics snapshot data used by AiModule to
 * build Claude prompts. Internal endpoint — guarded by InternalApiKeyGuard.
 */
export interface AnalyticsSummaryResponse {
  ownerId: string;
  recentSnapshots: AnalyticsSnapshot[];
  topPosts: AnalyticsSnapshot[];
}
