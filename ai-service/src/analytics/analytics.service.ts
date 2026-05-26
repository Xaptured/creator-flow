import { Injectable } from '@nestjs/common';

import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsSnapshot } from './model/snapshot.model.js';

/**
 * Internal-only analytics read service.
 * No HTTP controller -- consumed by AiModule to build Claude prompts.
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
}
