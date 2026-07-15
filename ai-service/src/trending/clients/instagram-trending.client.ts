import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MetaTokenService } from '../credentials/meta-token.service.js';
import { IG_NICHE_HASHTAGS } from '../config/ig-niche-hashtags.js';
import { GLOBAL_REGION } from '../config/region-codes.js';
import { RawTrend } from '../model/raw-trend.model.js';
import { TrendingClient } from './trending-client.interface.js';

const GRAPH_BASE_URL = 'https://graph.facebook.com/v21.0';
const TOP_MEDIA_LIMIT = 5;

interface HashtagSearchResponse {
  data?: { id: string }[];
}

interface TopMediaResponse {
  data?: { id: string; caption?: string }[];
}

/**
 * Instagram "trending" via Graph `ig_hashtag_search` + `top_media` over a
 * curated niche→hashtag map, with ONE app-level IG Business token.
 *
 * Region-independent: ig_hashtag_search has no region param, so this client
 * ignores the region argument and tags all rows 'GLOBAL'.
 *
 * Rate limit: 30 unique hashtags / 7 days / token — the curated map stays small
 * and hashtag IDs are cached in-memory so repeat refreshes don't re-search.
 */
@Injectable()
export class InstagramTrendingClient implements TrendingClient {
  private readonly logger = new Logger(InstagramTrendingClient.name);
  /** hashtag name → Graph hashtag node id (stable — cache for process lifetime). */
  private readonly hashtagIdCache = new Map<string, string>();

  constructor(
    private readonly config: ConfigService,
    private readonly metaTokenService: MetaTokenService,
  ) {}

  async fetch(_region: string): Promise<RawTrend[]> {
    if (this.config.get<string>('TRENDING_INSTAGRAM_ENABLED') !== 'true') {
      this.logger.log('Instagram trending disabled — skipping');
      return [];
    }
    // Rotated token from platform_credentials; falls back to env for first seed.
    const accessToken = await this.metaTokenService.getIgAccessToken();
    const igUserId = this.config.getOrThrow<string>('IG_BUSINESS_USER_ID');

    const trends: RawTrend[] = [];
    for (const [niche, hashtags] of Object.entries(IG_NICHE_HASHTAGS)) {
      for (const hashtag of hashtags) {
        try {
          const hashtagTrends = await this.fetchHashtag(
            hashtag,
            niche,
            igUserId,
            accessToken,
          );
          trends.push(...hashtagTrends);
        } catch (err) {
          // One hashtag failing (rate limit, transient) must not kill the batch.
          this.logger.warn(
            `IG hashtag #${hashtag} fetch failed — skipping: ${(err as Error).message}`,
          );
        }
      }
    }
    return trends;
  }

  private async fetchHashtag(
    hashtag: string,
    niche: string,
    igUserId: string,
    accessToken: string,
  ): Promise<RawTrend[]> {
    const hashtagId = await this.resolveHashtagId(
      hashtag,
      igUserId,
      accessToken,
    );
    if (!hashtagId) return [];

    const url = new URL(`${GRAPH_BASE_URL}/${hashtagId}/top_media`);
    url.searchParams.set('user_id', igUserId);
    url.searchParams.set('fields', 'id,caption');
    url.searchParams.set('limit', String(TOP_MEDIA_LIMIT));
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`top_media ${response.status} ${response.statusText}`);
    }
    const payload = (await response.json()) as TopMediaResponse;

    return (payload.data ?? [])
      .filter((media) => Boolean(media.caption))
      .map((media) => ({
        platform: 'INSTAGRAM' as const,
        rawText: media.caption!,
        sourceRef: hashtag,
        region: GLOBAL_REGION,
        // Niche is known directly from the curated map — no inference needed.
        nicheHint: niche,
      }));
  }

  private async resolveHashtagId(
    hashtag: string,
    igUserId: string,
    accessToken: string,
  ): Promise<string | null> {
    const cached = this.hashtagIdCache.get(hashtag);
    if (cached) return cached;

    const url = new URL(`${GRAPH_BASE_URL}/ig_hashtag_search`);
    url.searchParams.set('user_id', igUserId);
    url.searchParams.set('q', hashtag);
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `ig_hashtag_search ${response.status} ${response.statusText}`,
      );
    }
    const payload = (await response.json()) as HashtagSearchResponse;
    const id = payload.data?.[0]?.id ?? null;
    if (id) this.hashtagIdCache.set(hashtag, id);
    return id;
  }
}
