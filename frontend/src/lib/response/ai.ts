export interface Insight {
  title: string
  description: string
  actionableStep: string
}

export interface InsightsResponse {
  ownerId: string
  insights: Insight[]
}

export type CaptionTone = 'professional' | 'casual' | 'hype' | 'informative'

export interface CaptionVariant {
  tone: CaptionTone
  caption: string
}

export interface CaptionResponse {
  captions: CaptionVariant[]
}

export type VolumeCategory = 'high' | 'mid' | 'niche'

export interface HashtagItem {
  hashtag: string
  volumeCategory: VolumeCategory
}

export interface HashtagResponse {
  hashtags: HashtagItem[]
}

export type TrendingPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'TWITTER'

export interface ContentGap {
  topic: string
  platform: TrendingPlatform
  score: number
}

/** A ranked posting slot. dow: 0=Sunday..6=Saturday, creator's timezone. */
export interface BestTimeSlot {
  dow: number
  hourBlock: number
  label: string
  avgEngagement: number
  sampleSize: number
}

/** Heatmap cell (includes low-sample buckets excluded from ranking). */
export interface BestTimeBucket {
  dow: number
  hourBlock: number
  avgEngagement: number
  sampleSize: number
  lowSample: boolean
}

export interface BestTimeResponse {
  timezone: string
  recommendation: string
  bestSlots: BestTimeSlot[]
  buckets: BestTimeBucket[]
  platform?: TrendingPlatform
}

/** One audience question distilled from recent YouTube comments, with a content idea. */
export interface CommentDigestItem {
  question: string
  idea: string
}

export interface CommentDigestResponse {
  ownerId: string
  /** Up to 5 items; empty when the channel has no recent comments. */
  items: CommentDigestItem[]
  /** How many comments were analysed (0 → no YouTube data available). */
  commentCount: number
  generatedAt: string
}
