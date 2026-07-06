/**
 * A raw trend after Claude normalization: a clean, human-readable topic phrase
 * plus exactly one canonical niche name (validated against the niches lookup set).
 */
export interface NormalizedTopic {
  topic: string;
  niche: string;
}

/**
 * Canonical niche names — MUST match the `niches` lookup table seed (V14).
 * The normalizer validates every Claude-returned niche against this set.
 */
export const CANONICAL_NICHES: readonly string[] = [
  'Gaming',
  'Photography',
  'Tech',
  'Lifestyle',
  'Travel',
  'Fitness',
  'Food',
  'Education',
  'Business',
  'Art & Design',
  'Other',
] as const;
