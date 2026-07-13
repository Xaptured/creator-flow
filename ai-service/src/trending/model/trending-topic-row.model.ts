import { TrendingPlatform } from './raw-trend.model.js';

/** Input for one trending_topics upsert. */
export interface TrendingTopicUpsert {
  platform: TrendingPlatform;
  topic: string;
  sourceRef: string | null;
  niche: string;
  embedding: number[];
  model: string;
  region: string;
}

/** Raw DB row shapes (snake_case, as returned by pg). */
export interface GapRow {
  topic: string;
  platform: TrendingPlatform;
  nearest_distance: string;
}

export interface FallbackRow {
  topic: string;
  platform: TrendingPlatform;
}

export interface UserNicheRegionRow {
  niche: string | null;
  region: string | null;
}
