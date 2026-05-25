import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { CanActivate, Type } from '@nestjs/common';

import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard.js';
import { AnalyticsService } from './analytics.service.js';
import type { IngestAnalyticsRequest } from './dto/ingest-analytics.request.js';
import type { IngestAnalyticsResponse } from './dto/ingest-analytics.response.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * POST /api/analytics/ingest
   *
   * Internal endpoint — called by Spring Boot scheduler-service.
   * Protected by x-internal-api-key header (InternalApiKeyGuard).
   */
  @Post('ingest')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(InternalApiKeyGuard as Type<CanActivate>)
  async ingest(
    @Body() body: IngestAnalyticsRequest,
  ): Promise<IngestAnalyticsResponse> {
    return this.analyticsService.ingest(body);
  }
}
