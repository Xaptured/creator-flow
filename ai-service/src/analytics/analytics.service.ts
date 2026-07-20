import { Injectable } from '@nestjs/common';

import { AnalyticsRepository } from './analytics.repository.js';
import { BestTimeBucket } from './model/best-time-bucket.model.js';
import { AnalyticsSnapshot } from './model/snapshot.model.js';

/**
 * Internal-only analytics read service.
 * No HTTP ingest — analytics-service owns all metric writes.
 * Consumed by AiModule to build Claude prompts.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  getRecentSnapshots(ownerId: string): Promise<AnalyticsSnapshot[]> {
    return this.repository.getRecentSnapshots(ownerId);
  }

  getTopPosts(ownerId: string): Promise<AnalyticsSnapshot[]> {
    return this.repository.getTopPosts(ownerId);
  }

  getBestTimeBuckets(
    ownerId: string,
    platform: string | null,
  ): Promise<BestTimeBucket[]> {
    return this.repository.getBestTimeBuckets(ownerId, platform);
  }

  getUserTimezone(ownerId: string): Promise<string> {
    return this.repository.getUserTimezone(ownerId);
  }
}
