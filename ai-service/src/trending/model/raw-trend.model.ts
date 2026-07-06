/** Platforms trending topics are fetched from. Mirrors the platform_type Postgres enum (V2). */
export type TrendingPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TWITTER';

export const TRENDING_PLATFORMS: readonly TrendingPlatform[] = [
  'YOUTUBE',
  'INSTAGRAM',
  'TWITTER',
] as const;

export function isTrendingPlatform(value: string): value is TrendingPlatform {
  return (TRENDING_PLATFORMS as readonly string[]).includes(value);
}

/**
 * One raw trending item as returned by a platform client, before Claude
 * normalization. `region` is an ISO 3166-1 alpha-2 code for region-scoped
 * platforms (YouTube, X) or 'GLOBAL' for Instagram.
 */
export interface RawTrend {
  platform: TrendingPlatform;
  rawText: string;
  sourceRef: string;
  region: string;
  /** Optional niche the client already knows (e.g. IG curated hashtag map). */
  nicheHint?: string;
}
