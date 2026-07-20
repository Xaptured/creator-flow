/** Raw pg row — numerics arrive as strings. */
export interface BestTimeBucketRow {
  dow: number;
  hour_block: number;
  avg_engagement: string;
  sample_size: string;
}

/** One (day-of-week × 3h-block) engagement bucket. dow: 0=Sunday..6=Saturday. */
export interface BestTimeBucket {
  dow: number;
  hourBlock: number;
  avgEngagement: number;
  sampleSize: number;
}
