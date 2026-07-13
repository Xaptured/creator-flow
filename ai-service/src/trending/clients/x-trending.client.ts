import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { X_WOEID_BY_REGION } from '../config/region-codes.js';
import { RawTrend } from '../model/raw-trend.model.js';
import { TrendingClient } from './trending-client.interface.js';

const X_TRENDS_URL = 'https://api.x.com/2/trends/by/woeid';

interface XTrendsResponse {
  data?: { trend_name: string; tweet_count?: number }[];
}

/**
 * X (Twitter) trending via the official Pro-tier `GET /2/trends/by/woeid/{woeid}`.
 * Pro access costs ~$5k/mo — gated behind TRENDING_X_ENABLED (default off) so it
 * can be toggled without a deploy. Region-scoped via WOEID mapping.
 */
@Injectable()
export class XTrendingClient implements TrendingClient {
  private readonly logger = new Logger(XTrendingClient.name);

  constructor(private readonly config: ConfigService) {}

  async fetch(region: string): Promise<RawTrend[]> {
    if (this.config.get<string>('TRENDING_X_ENABLED') !== 'true') {
      this.logger.log('X trending disabled (TRENDING_X_ENABLED!=true) — skipping');
      return [];
    }

    const woeid = X_WOEID_BY_REGION[region];
    if (!woeid) {
      this.logger.warn(`No WOEID mapped for region ${region} — skipping X`);
      return [];
    }

    const bearerToken = this.config.getOrThrow<string>('X_API_BEARER_TOKEN');
    const response = await fetch(`${X_TRENDS_URL}/${woeid}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (!response.ok) {
      throw new Error(
        `X trending fetch failed: ${response.status} ${response.statusText}`,
      );
    }
    const payload = (await response.json()) as XTrendsResponse;

    return (payload.data ?? [])
      .filter((trend) => Boolean(trend.trend_name))
      .map((trend) => ({
        platform: 'TWITTER' as const,
        rawText: trend.trend_name,
        sourceRef: trend.trend_name,
        region,
      }));
  }
}
