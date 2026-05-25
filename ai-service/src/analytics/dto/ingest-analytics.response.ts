export interface IngestAnalyticsResponse {
  id: string;
  contentId: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  snapshotAt: Date;
}
