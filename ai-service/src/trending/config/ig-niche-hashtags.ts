/**
 * Curated niche → Instagram hashtag map.
 *
 * The Graph API has no trending/Explore endpoint; IG "trending" is approximated
 * by querying top_media for a small curated hashtag set per niche with ONE
 * app-level IG Business token.
 *
 * HARD LIMIT: ig_hashtag_search allows 30 UNIQUE hashtags per 7 days per token.
 * The total hashtag count across ALL niches below MUST stay well under 30.
 * Current total: 22. Hashtag IDs are cached in-memory to avoid re-searching.
 *
 * Keys MUST be canonical niches.name values (V14).
 */
export const IG_NICHE_HASHTAGS: Readonly<Record<string, readonly string[]>> = {
  Gaming: ['gaming', 'gamer'],
  Photography: ['photography', 'photooftheday'],
  Tech: ['tech', 'technology'],
  Lifestyle: ['lifestyle', 'dailylife'],
  Travel: ['travel', 'wanderlust'],
  Fitness: ['fitness', 'workout'],
  Food: ['foodie', 'recipes'],
  Education: ['learning', 'studygram'],
  Business: ['entrepreneur', 'smallbusiness'],
  'Art & Design': ['artist', 'design'],
  // 'Other' intentionally omitted — low-signal niche, suppressed from gap cards.
};
