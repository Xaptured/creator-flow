import { BadRequestException, Injectable } from '@nestjs/common';

import { AnalyticsRepository } from './analytics.repository.js';
import {
  IngestAnalyticsRequest,
  Platform,
} from './dto/ingest-analytics.request.js';
import { IngestAnalyticsResponse } from './dto/ingest-analytics.response.js';

const ALLOWED_PLATFORMS: Set<Platform> = new Set([
  'YOUTUBE',
  'INSTAGRAM',
  'TWITTER',
]);

@Injectable()
export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async ingest(req: IngestAnalyticsRequest): Promise<IngestAnalyticsResponse> {
    this.validate(req);
    return this.repository.insertSnapshot(req);
  }

  private validate(req: IngestAnalyticsRequest): void {
    if (!req.contentId || typeof req.contentId !== 'string') {
      throw new BadRequestException('contentId is required');
    }
    if (!ALLOWED_PLATFORMS.has(req.platform)) {
      throw new BadRequestException(
        `platform must be one of: ${[...ALLOWED_PLATFORMS].join(', ')}`,
      );
    }
    if (req.views < 0 || req.likes < 0 || req.comments < 0) {
      throw new BadRequestException(
        'views, likes, and comments must be non-negative',
      );
    }
  }
}
