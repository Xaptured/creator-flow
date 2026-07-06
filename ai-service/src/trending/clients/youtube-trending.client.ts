import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RawTrend } from '../model/raw-trend.model.js';
import { TrendingClient } from './trending-client.interface.js';

const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const MAX_RESULTS = 25;

interface YoutubeVideosResponse {
  items?: {
    id: string;
    snippet?: { title?: string; categoryId?: string };
  }[];
}

/**
 * YouTube trending via Data API `videos.list?chart=mostPopular`.
 * Official, free, returns topic-shaped video titles. Region-scoped: the ISO
 * region code is passed directly as `regionCode`.
 */
@Injectable()
export class YoutubeTrendingClient implements TrendingClient {
  private readonly logger = new Logger(YoutubeTrendingClient.name);

  constructor(private readonly config: ConfigService) {}

  async fetch(region: string): Promise<RawTrend[]> {
    if (this.config.get<string>('TRENDING_YOUTUBE_ENABLED') !== 'true') {
      this.logger.log('YouTube trending disabled — skipping');
      return [];
    }
    const apiKey = this.config.getOrThrow<string>('YOUTUBE_API_KEY');

    const url = new URL(YOUTUBE_VIDEOS_URL);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('regionCode', region);
    url.searchParams.set('maxResults', String(MAX_RESULTS));
    url.searchParams.set('key', apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `YouTube trending fetch failed: ${response.status} ${response.statusText}`,
      );
    }
    const payload = (await response.json()) as YoutubeVideosResponse;

    return (payload.items ?? [])
      .filter((item) => Boolean(item.snippet?.title))
      .map((item) => ({
        platform: 'YOUTUBE' as const,
        rawText: item.snippet!.title!,
        sourceRef: item.id,
        region,
      }));
  }
}
