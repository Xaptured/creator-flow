import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { GLOBAL_REGION } from './config/region-codes.js';
import { TrendingPlatform } from './model/raw-trend.model.js';
import { RefreshResult, TrendingService } from './trending.service.js';
import { TrendingRepository } from './trending.repository.js';

export interface RefreshAllResult {
  results: RefreshResult[];
  failures: { platform: TrendingPlatform; region: string; error: string }[];
}

const YT_IG_CRON_JOB = 'trending-refresh-yt-ig';
const X_CRON_JOB = 'trending-refresh-x';

/**
 * Orchestrates trending refreshes across enabled platforms × regions in use.
 *
 * Scheduling is deploy-dependent because ai-service runs dual-mode:
 * - Lambda (prod): EventBridge Scheduler → POST /api/ai/trending/refresh
 *   (InternalApiKeyGuard). In-process timers do NOT fire reliably on Lambda,
 *   so cron registration is skipped via DISABLE_TRENDING_CRON=true — same
 *   pattern as DISABLE_SQS_POLLING.
 * - Container / local: in-process cron jobs registered below.
 */
@Injectable()
export class TrendingRefreshService implements OnModuleInit {
  private readonly logger = new Logger(TrendingRefreshService.name);

  constructor(
    private readonly trendingService: TrendingService,
    private readonly repository: TrendingRepository,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('DISABLE_TRENDING_CRON') === 'true') {
      this.logger.log('Trending cron disabled (DISABLE_TRENDING_CRON=true)');
      return;
    }
    // Cadence per platform group: YouTube/IG cheap+fresh (6h), X costly (daily).
    this.registerCron(
      YT_IG_CRON_JOB,
      this.config.get<string>('TRENDING_REFRESH_CRON', '0 */6 * * *'),
      () => this.refreshAll(['YOUTUBE', 'INSTAGRAM']),
    );
    this.registerCron(
      X_CRON_JOB,
      this.config.get<string>('TRENDING_X_REFRESH_CRON', '0 3 * * *'),
      () => this.refreshAll(['TWITTER']),
    );
  }

  /**
   * Refresh the given platforms (default: all enabled) across every region in
   * use (DISTINCT users.region ∪ TRENDING_DEFAULT_REGION). A failing
   * (platform, region) is logged and skipped — never aborts the others.
   */
  async refreshAll(
    platforms?: TrendingPlatform[],
  ): Promise<RefreshAllResult> {
    const enabled = (platforms ?? ['YOUTUBE', 'INSTAGRAM', 'TWITTER']).filter(
      (platform) => this.isEnabled(platform),
    );
    const regions = await this.resolveRegions();

    const results: RefreshResult[] = [];
    const failures: RefreshAllResult['failures'] = [];

    for (const platform of enabled) {
      // Instagram is region-independent — runs ONCE, rows tagged GLOBAL.
      const platformRegions =
        platform === 'INSTAGRAM' ? [GLOBAL_REGION] : regions;
      for (const region of platformRegions) {
        try {
          results.push(await this.trendingService.refresh(platform, region));
        } catch (err) {
          const error = (err as Error).message;
          this.logger.error(`Refresh failed ${platform}/${region}: ${error}`);
          failures.push({ platform, region, error });
        }
      }
    }
    return { results, failures };
  }

  private async resolveRegions(): Promise<string[]> {
    const defaultRegion = this.config.get<string>(
      'TRENDING_DEFAULT_REGION',
      'US',
    );
    const inUse = await this.repository.getRegionsInUse();
    return [...new Set([...inUse, defaultRegion])];
  }

  private isEnabled(platform: TrendingPlatform): boolean {
    const flagByPlatform: Record<TrendingPlatform, string> = {
      YOUTUBE: 'TRENDING_YOUTUBE_ENABLED',
      INSTAGRAM: 'TRENDING_INSTAGRAM_ENABLED',
      TWITTER: 'TRENDING_X_ENABLED',
    };
    return this.config.get<string>(flagByPlatform[platform]) === 'true';
  }

  private registerCron(
    name: string,
    expression: string,
    handler: () => Promise<RefreshAllResult>,
  ): void {
    const job = new CronJob(expression, () => {
      void handler().catch((err: Error) =>
        this.logger.error(`Scheduled refresh ${name} failed: ${err.message}`),
      );
    });
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
    this.logger.log(`Registered cron ${name} (${expression})`);
  }
}
