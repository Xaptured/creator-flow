import { TrendingPlatform } from '../model/raw-trend.model.js';

/**
 * One content gap: a trending topic in the creator's niche whose nearest
 * match in the creator's content catalogue is far away (= not covered).
 * `score` = cosine distance to the nearest content embedding — higher = bigger gap.
 * For empty-catalogue fallback rows (no embeddings at all), score = 1 (fully uncovered).
 */
export interface ContentGap {
  topic: string;
  platform: TrendingPlatform;
  score: number;
}
