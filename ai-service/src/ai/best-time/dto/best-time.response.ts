import { TrendingPlatform } from '../../../trending/model/raw-trend.model.js';

/** A ranked posting slot (top of the qualifying buckets). */
export interface BestTimeSlot {
  /** 0=Sunday .. 6=Saturday, in the creator's timezone. */
  dow: number;
  /** Start hour of the 3-hour block (0, 3, ... 21), creator's timezone. */
  hourBlock: number;
  /** Human label, e.g. "Wednesday 6–9 PM". */
  label: string;
  avgEngagement: number;
  sampleSize: number;
}

/** Heatmap cell — includes buckets below the ranking sample threshold. */
export interface BestTimeBucketDto {
  dow: number;
  hourBlock: number;
  avgEngagement: number;
  sampleSize: number;
  /** True when below BEST_TIME_MIN_SAMPLES — shown dimmed, excluded from ranking. */
  lowSample: boolean;
}

export interface BestTimeResponse {
  /** IANA timezone all buckets/labels are expressed in. */
  timezone: string;
  /** Claude narrative (or template fallback / friendly empty-state message). */
  recommendation: string;
  /** Top 3 qualifying slots, best first. Empty when not enough history. */
  bestSlots: BestTimeSlot[];
  /** All buckets for the heatmap. */
  buckets: BestTimeBucketDto[];
  /** Platform filter this result was computed for (absent = all platforms). */
  platform?: TrendingPlatform;
}
