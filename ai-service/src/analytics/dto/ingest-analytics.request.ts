export type Platform = 'YOUTUBE' | 'INSTAGRAM' | 'TWITTER';

export interface IngestAnalyticsRequest {
  contentId: string;
  platform: Platform;
  views: number;
  likes: number;
  comments: number;
  snapshotAt?: string;
}
