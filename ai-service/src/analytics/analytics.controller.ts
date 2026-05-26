import { Controller, Get, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';

import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard.js';
import { AnalyticsSummaryResponse } from './dto/analytics-summary.response.js';
import { AnalyticsService } from './analytics.service.js';

/**
 * Internal analytics read endpoint.
 *
 * Secured with InternalApiKeyGuard (x-internal-api-key header).
 * Called by other internal services (e.g. scheduler-service) — not user-facing.
 * No ingest endpoint exists here; analytics-service owns all metric writes.
 */
@Controller('analytics')
@UseGuards(InternalApiKeyGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Returns the last 30 days of analytics snapshots for the given owner,
   * plus their top-performing posts.  Used by AiModule to build Claude prompts.
   */
  @Get('summary/:ownerId')
  @HttpCode(HttpStatus.OK)
  async getSummary(
    @Param('ownerId') ownerId: string,
  ): Promise<AnalyticsSummaryResponse> {
    const [recentSnapshots, topPosts] = await Promise.all([
      this.analyticsService.getRecentSnapshots(ownerId),
      this.analyticsService.getTopPosts(ownerId),
    ]);

    return { ownerId, recentSnapshots, topPosts };
  }
}
