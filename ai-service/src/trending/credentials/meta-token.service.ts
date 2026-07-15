import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { TrendingRepository } from '../trending.repository.js';

const GRAPH_TOKEN_URL = 'https://graph.facebook.com/v21.0/oauth/access_token';
const IG_TOKEN_KEY = 'IG_APP_ACCESS_TOKEN';
const CRON_JOB_NAME = 'meta-ig-token-refresh';

export interface TokenRefreshResult {
  refreshed: boolean;
  /** Seconds until the NEW token expires, as reported by Meta (~60 days). */
  expiresInSeconds: number | null;
}

interface FbExchangeResponse {
  access_token?: string;
  expires_in?: number;
}

/**
 * Keeps the app-level Meta token (used by InstagramTrendingClient for
 * ig_hashtag_search / top_media) alive without manual intervention.
 *
 * Meta long-lived tokens (~60 days) can be re-exchanged for a FRESH 60-day
 * token while still valid (`fb_exchange_token` accepts a long-lived token).
 * A weekly re-exchange therefore keeps the token permanently far from expiry;
 * a single failed run is harmless and just logs.
 *
 * Token resolution order: platform_credentials table (rotated value) →
 * IG_APP_ACCESS_TOKEN env (first seed). After the first successful refresh the
 * table is authoritative and the env value is only a bootstrap fallback.
 *
 * Scheduling follows the ai-service dual-mode pattern: in-process weekly cron
 * for containers; on Lambda set DISABLE_TRENDING_CRON=true and point an
 * EventBridge rule at POST /api/ai/trending/credentials/refresh-ig.
 *
 * Long-term (production) replacement: a Meta Business System User token
 * (non-expiring, needs business verification) — this service then becomes a
 * no-op safety net.
 */
@Injectable()
export class MetaTokenService implements OnModuleInit {
  private readonly logger = new Logger(MetaTokenService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly repository: TrendingRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('DISABLE_TRENDING_CRON') === 'true') {
      this.logger.log(
        'IG token refresh cron disabled (DISABLE_TRENDING_CRON=true)',
      );
      return;
    }
    if (!this.isConfigured()) {
      this.logger.log(
        'META_APP_ID / META_APP_SECRET not set — IG token refresh cron not registered',
      );
      return;
    }
    const expression = this.config.get<string>(
      'TRENDING_IG_TOKEN_REFRESH_CRON',
      '0 4 * * 1', // weekly, Monday 04:00
    );
    const job = new CronJob(expression, () => {
      void this.refreshIgToken().catch((err: Error) =>
        this.logger.error(`Scheduled IG token refresh failed: ${err.message}`),
      );
    });
    this.schedulerRegistry.addCronJob(CRON_JOB_NAME, job);
    job.start();
    this.logger.log(`Registered cron ${CRON_JOB_NAME} (${expression})`);
  }

  /** Current IG token: rotated value from the DB, or the env bootstrap value. */
  async getIgAccessToken(): Promise<string> {
    const stored = await this.repository.getCredential(IG_TOKEN_KEY);
    if (stored) return stored;
    const fromEnv = this.config.get<string>('IG_APP_ACCESS_TOKEN');
    if (fromEnv) return fromEnv;
    throw new Error(
      'No IG access token available — set IG_APP_ACCESS_TOKEN or seed platform_credentials',
    );
  }

  /**
   * Re-exchange the current token for a fresh ~60-day one and persist it.
   * Throws on failure — callers (cron wrapper / ops endpoint) handle logging.
   * The old token stays valid until its own expiry, so a failed exchange never
   * makes things worse.
   */
  async refreshIgToken(): Promise<TokenRefreshResult> {
    if (!this.isConfigured()) {
      throw new Error('META_APP_ID / META_APP_SECRET not configured');
    }
    const currentToken = await this.getIgAccessToken();

    const url = new URL(GRAPH_TOKEN_URL);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set(
      'client_id',
      this.config.getOrThrow<string>('META_APP_ID'),
    );
    url.searchParams.set(
      'client_secret',
      this.config.getOrThrow<string>('META_APP_SECRET'),
    );
    url.searchParams.set('fb_exchange_token', currentToken);

    const response = await fetch(url);
    if (!response.ok) {
      // Meta error bodies can echo tokens — log status only.
      throw new Error(
        `Token exchange failed: ${response.status} ${response.statusText}`,
      );
    }
    const payload = (await response.json()) as FbExchangeResponse;
    if (!payload.access_token) {
      throw new Error('Token exchange returned no access_token');
    }

    await this.repository.setCredential(IG_TOKEN_KEY, payload.access_token);
    const expiresInSeconds = payload.expires_in ?? null;
    this.logger.log(
      `IG app token refreshed (expires_in=${expiresInSeconds ?? 'unknown'}s)`,
    );
    return { refreshed: true, expiresInSeconds };
  }

  private isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('META_APP_ID') &&
      this.config.get<string>('META_APP_SECRET'),
    );
  }
}
