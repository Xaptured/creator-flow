import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard.js';
import { isTrendingPlatform } from './model/raw-trend.model.js';
import {
  RefreshAllResult,
  TrendingRefreshService,
} from './trending-refresh.service.js';
import { RefreshResult, TrendingService } from './trending.service.js';

/**
 * Manual / ops trending refresh — first seed, backfill, debugging, and the
 * EventBridge → HTTP trigger in Lambda deployments.
 * Internal only (x-internal-api-key) — not user-facing.
 */
@Controller('ai/trending')
@UseGuards(InternalApiKeyGuard)
export class TrendingController {
  constructor(
    private readonly trendingService: TrendingService,
    private readonly refreshService: TrendingRefreshService,
  ) {}

  /**
   * POST /api/ai/trending/refresh            → all enabled platforms × regions in use
   * POST /api/ai/trending/refresh?platform=YOUTUBE&region=US → one (platform, region)
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Query('platform') platform?: string,
    @Query('region') region?: string,
  ): Promise<RefreshAllResult | RefreshResult> {
    if (platform) {
      if (!isTrendingPlatform(platform)) {
        throw new BadRequestException(
          `Unknown platform '${platform}' — expected YOUTUBE | INSTAGRAM | TWITTER`,
        );
      }
      if (!region) {
        throw new BadRequestException(
          'region is required when platform is specified',
        );
      }
      return this.trendingService.refresh(platform, region);
    }
    return this.refreshService.refreshAll();
  }
}
