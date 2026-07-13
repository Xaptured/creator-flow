import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmbeddingProviderService } from '../../embeddings/provider/embedding-provider.service.js';
import { ContentGap } from '../dto/content-gap.dto.js';
import { TrendingPlatform } from '../model/raw-trend.model.js';
import { TrendingRepository } from '../trending.repository.js';

/** 'Other' niche is suppressed from gap cards — too low-signal to be actionable. */
const SUPPRESSED_NICHE = 'Other';
const DEFAULT_FRESHNESS_HOURS = 48;
const DEFAULT_REGION = 'US';

/**
 * Content gap detection: trending topics in the creator's niche that sit far
 * from everything in their content catalogue (max-of-min cosine distance).
 */
@Injectable()
export class GapService {
  private readonly logger = new Logger(GapService.name);

  constructor(
    private readonly repository: TrendingRepository,
    private readonly embeddingProvider: EmbeddingProviderService,
    private readonly config: ConfigService,
  ) {}

  async getGaps(
    ownerId: string,
    platform: TrendingPlatform | null,
  ): Promise<ContentGap[]> {
    const user = await this.repository.getUserNicheRegion(ownerId);
    if (!user?.niche || user.niche === SUPPRESSED_NICHE) {
      this.logger.debug(
        `Owner ${ownerId}: niche missing or suppressed — no gaps`,
      );
      return [];
    }

    const region = await this.resolveRegion(user.region);
    const model = this.embeddingProvider.modelName;
    const freshnessHours = Number(
      this.config.get('TRENDING_FRESHNESS_HOURS', DEFAULT_FRESHNESS_HOURS),
    );

    const gaps = await this.repository.findGaps(
      model,
      ownerId,
      user.niche,
      platform,
      region,
      freshnessHours,
    );
    if (gaps.length > 0) return gaps;

    // Empty catalogue: zero embeddings join to nothing — everything trending
    // in the niche is a gap. Return the freshest, score pinned to 1.
    const hasEmbeddings = await this.repository.hasAnyEmbedding(
      ownerId,
      model,
    );
    if (!hasEmbeddings) {
      return this.repository.findFallbackTopics(
        model,
        user.niche,
        platform,
        region,
        freshnessHours,
      );
    }
    return [];
  }

  /** Fallback to the default region if the user's is null or inactive. */
  private async resolveRegion(region: string | null): Promise<string> {
    const defaultRegion = this.config.get<string>(
      'TRENDING_DEFAULT_REGION',
      DEFAULT_REGION,
    );
    if (!region) return defaultRegion;
    return (await this.repository.isActiveRegion(region))
      ? region
      : defaultRegion;
  }
}
