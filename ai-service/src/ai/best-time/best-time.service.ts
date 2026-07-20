import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AnalyticsService } from '../../analytics/analytics.service.js';
import { BestTimeBucket } from '../../analytics/model/best-time-bucket.model.js';
import { TrendingPlatform } from '../../trending/model/raw-trend.model.js';
import { ClaudeService } from '../claude/claude.service.js';
import { PromptService } from '../prompt/prompt.service.js';
import { BestTimeResponse, BestTimeSlot } from './dto/best-time.response.js';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const TOP_SLOTS = 3;
const DEFAULT_MIN_SAMPLES = 2;
const MAX_RECOMMENDATION_LENGTH = 500;

const EMPTY_MESSAGE =
  'Not enough posting history yet — publish a few posts and check back.';

/**
 * Best-time-to-post (CF-95 Day 4). Ranking is pure SQL (deterministic);
 * Claude only writes the 1-2 sentence narrative from the top buckets.
 * No data → friendly message, Claude NOT called.
 * Claude failure → template built from slot #1; the endpoint never fails
 * because the narrative did.
 */
@Injectable()
export class BestTimeService {
  private readonly logger = new Logger(BestTimeService.name);
  private readonly minSamples: number;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly claudeService: ClaudeService,
    private readonly promptService: PromptService,
    config: ConfigService,
  ) {
    // ConfigService returns env vars as strings — coerce explicitly.
    this.minSamples = Number(
      config.get('BEST_TIME_MIN_SAMPLES', DEFAULT_MIN_SAMPLES),
    );
  }

  async getBestTime(
    ownerId: string,
    platform: TrendingPlatform | null,
  ): Promise<BestTimeResponse> {
    const [buckets, timezone] = await Promise.all([
      this.analyticsService.getBestTimeBuckets(ownerId, platform),
      this.analyticsService.getUserTimezone(ownerId),
    ]);

    const bucketDtos = buckets.map((bucket) => ({
      ...bucket,
      lowSample: bucket.sampleSize < this.minSamples,
    }));

    const bestSlots = buckets
      .filter((bucket) => bucket.sampleSize >= this.minSamples)
      .slice(0, TOP_SLOTS)
      .map((bucket) => this.toSlot(bucket));

    const base: BestTimeResponse = {
      timezone,
      recommendation: EMPTY_MESSAGE,
      bestSlots,
      buckets: bucketDtos,
      ...(platform ? { platform } : {}),
    };

    if (bestSlots.length === 0) {
      // Not enough qualifying history — do NOT spend a Claude call.
      return base;
    }

    return { ...base, recommendation: await this.narrate(bestSlots, timezone) };
  }

  /** Claude narrative with a deterministic template fallback. */
  private async narrate(
    slots: BestTimeSlot[],
    timezone: string,
  ): Promise<string> {
    try {
      const raw = await this.claudeService.complete(
        this.promptService.bestTimeSystem(),
        this.promptService.buildBestTimePrompt(slots, timezone),
      );
      const trimmed = raw.trim();
      if (trimmed.length === 0) throw new Error('empty completion');
      return trimmed.slice(0, MAX_RECOMMENDATION_LENGTH);
    } catch (err) {
      this.logger.warn(
        `Claude narrative failed — using template: ${(err as Error).message}`,
      );
      return `Best slot so far: ${slots[0].label}.`;
    }
  }

  private toSlot(bucket: BestTimeBucket): BestTimeSlot {
    return {
      dow: bucket.dow,
      hourBlock: bucket.hourBlock,
      label: `${DAY_NAMES[bucket.dow]} ${formatBlock(bucket.hourBlock)}`,
      avgEngagement: bucket.avgEngagement,
      sampleSize: bucket.sampleSize,
    };
  }
}

/** 18 → "6–9 PM", 9 → "9 AM–12 PM", 21 → "9 PM–12 AM". */
export function formatBlock(startHour: number): string {
  const endHour = (startHour + 3) % 24;
  const fmt = (hour: number): { text: string; meridiem: string } => {
    const meridiem = hour < 12 ? 'AM' : 'PM';
    const twelve = hour % 12 === 0 ? 12 : hour % 12;
    return { text: String(twelve), meridiem };
  };
  const start = fmt(startHour);
  const end = fmt(endHour);
  return start.meridiem === end.meridiem
    ? `${start.text}–${end.text} ${end.meridiem}`
    : `${start.text} ${start.meridiem}–${end.text} ${end.meridiem}`;
}
