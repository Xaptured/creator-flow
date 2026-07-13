import { Injectable, Logger } from '@nestjs/common';

import { EmbeddingProviderService } from '../embeddings/provider/embedding-provider.service.js';
import { InstagramTrendingClient } from './clients/instagram-trending.client.js';
import { TrendingClient } from './clients/trending-client.interface.js';
import { XTrendingClient } from './clients/x-trending.client.js';
import { YoutubeTrendingClient } from './clients/youtube-trending.client.js';
import { TrendingPlatform } from './model/raw-trend.model.js';
import { TrendingTopicUpsert } from './model/trending-topic-row.model.js';
import { TopicNormalizerService } from './normalizer/topic-normalizer.service.js';
import { TrendingRepository } from './trending.repository.js';

export interface RefreshResult {
  platform: TrendingPlatform;
  region: string;
  fetched: number;
  written: number;
}

/** 'Other' is low-signal — not worth an embedding; gap cards suppress it anyway. */
const SUPPRESSED_NICHE = 'Other';

/**
 * One platform-agnostic refresh pipeline:
 * fetch → Claude-normalize → embed (SAME model as content) → upsert.
 * Only the fetch client differs per platform.
 */
@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);
  private readonly clients: Record<TrendingPlatform, TrendingClient>;

  constructor(
    youtubeClient: YoutubeTrendingClient,
    xClient: XTrendingClient,
    instagramClient: InstagramTrendingClient,
    private readonly normalizer: TopicNormalizerService,
    private readonly embeddingProvider: EmbeddingProviderService,
    private readonly repository: TrendingRepository,
  ) {
    this.clients = {
      YOUTUBE: youtubeClient,
      TWITTER: xClient,
      INSTAGRAM: instagramClient,
    };
  }

  /** Refresh one (platform, region) end-to-end. Idempotent (upsert). */
  async refresh(
    platform: TrendingPlatform,
    region: string,
  ): Promise<RefreshResult> {
    const rawTrends = await this.clients[platform].fetch(region);
    if (rawTrends.length === 0) {
      return { platform, region, fetched: 0, written: 0 };
    }

    const normalized = await this.normalizer.normalize(rawTrends);
    const usable = normalized.filter(
      ({ normalized: topic }) => topic.niche !== SUPPRESSED_NICHE,
    );
    // Dedupe within the batch on the upsert conflict key (platform, topic, region).
    const deduped = [
      ...new Map(
        usable.map((pair) => [
          `${pair.raw.platform}|${pair.normalized.topic}|${pair.raw.region}`,
          pair,
        ]),
      ).values(),
    ];
    if (deduped.length === 0) {
      this.logger.warn(
        `${platform}/${region}: ${rawTrends.length} fetched, none usable after normalization`,
      );
      return { platform, region, fetched: rawTrends.length, written: 0 };
    }

    const embeddings = await this.embeddingProvider.embedBatch(
      deduped.map((pair) => pair.normalized.topic),
    );

    const rows: TrendingTopicUpsert[] = deduped.map((pair, index) => ({
      platform: pair.raw.platform,
      topic: pair.normalized.topic,
      sourceRef: pair.raw.sourceRef,
      niche: pair.normalized.niche,
      embedding: embeddings[index],
      model: this.embeddingProvider.modelName,
      region: pair.raw.region,
    }));

    const written = await this.repository.upsertTopics(rows);
    this.logger.log(
      `${platform}/${region}: fetched=${rawTrends.length} written=${written}`,
    );
    return { platform, region, fetched: rawTrends.length, written };
  }
}
