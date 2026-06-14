import { PlatformType } from '@/lib/response/scheduler'

export interface PlatformSummary {
  platform: PlatformType
  views: number
  likes: number
  comments: number
  impressions: number
}

export interface TopPost {
  contentId: string
  title: string | null
  platform: PlatformType
  views: number
  likes: number
  comments: number
  engagementRate: number
}

export interface ContentSnapshot {
  id: string
  contentId: string
  title: string | null
  platform: PlatformType
  views: number
  likes: number
  comments: number
  impressions: number
  engagementRate: number | null
  windowHours: number
  windowLabel: string
  fetchedAt: string
}
