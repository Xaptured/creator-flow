/**
 * Region → platform-specific code mapping.
 *
 * Keys are ISO 3166-1 alpha-2 codes matching the `regions` lookup table (V24).
 * - YouTube uses the ISO code DIRECTLY as `regionCode` — no mapping needed.
 * - X (Twitter) needs a WOEID (Where-On-Earth ID) per region.
 * - Instagram is region-independent — ig_hashtag_search has no region param;
 *   IG rows are stored with region 'GLOBAL'.
 *
 * Every region seeded in V24 MUST have a WOEID here, otherwise the X refresh
 * silently skips that region (logged).
 */
export const X_WOEID_BY_REGION: Readonly<Record<string, number>> = {
  US: 23424977, // United States
  GB: 23424975, // United Kingdom
  IN: 23424848, // India
  CA: 23424775, // Canada
  AU: 23424748, // Australia
  DE: 23424829, // Germany
  BR: 23424768, // Brazil
};

/** Region value stored on rows from region-independent platforms (Instagram). */
export const GLOBAL_REGION = 'GLOBAL';
