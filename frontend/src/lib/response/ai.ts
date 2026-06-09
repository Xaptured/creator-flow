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
