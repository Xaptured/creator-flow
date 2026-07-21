import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Shape returned by analytics-service GET /v1.0/api/analytics/comments/{ownerId}. */
export interface ChannelComment {
  videoId: string;
  author: string;
  text: string;
  likeCount: number;
  publishedAt: string | null;
}

const COMMENTS_PATH = '/v1.0/api/analytics/comments';
const DEFAULT_ANALYTICS_URL = 'http://localhost:8083/creator-flow/analytics';
const FETCH_TIMEOUT_MS = 10_000;

/**
 * HTTP client to analytics-service's channel-comments endpoint.
 *
 * The caller's Keycloak Bearer token is forwarded as-is — ai-service never
 * holds platform OAuth tokens (CF-96 architecture note); analytics-service
 * owns the YouTube token and does the actual Data API call.
 *
 * Resilience contract: any failure (non-200, network error, malformed body)
 * logs and returns an empty list — the digest degrades to its empty state
 * instead of failing the request.
 */
@Injectable()
export class AnalyticsCommentsClient {
  private readonly logger = new Logger(AnalyticsCommentsClient.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>(
      'ANALYTICS_SERVICE_URL',
      DEFAULT_ANALYTICS_URL,
    );
  }

  async fetchRecentComments(
    ownerId: string,
    accessToken: string,
    limit: number,
  ): Promise<ChannelComment[]> {
    const url = `${this.baseUrl}${COMMENTS_PATH}/${encodeURIComponent(ownerId)}?limit=${limit}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.error(
          `analytics-service comments fetch failed — status ${response.status} for owner ${ownerId}`,
        );
        return [];
      }

      const body = (await response.json()) as unknown;
      if (!Array.isArray(body)) {
        this.logger.error(
          `analytics-service comments response is not an array for owner ${ownerId}`,
        );
        return [];
      }
      return body as ChannelComment[];
    } catch (err) {
      this.logger.error(
        `analytics-service comments fetch error for owner ${ownerId}: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
