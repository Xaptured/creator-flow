export interface SnapshotRow {
  id: string;
  content_id: string;
  platform: string;
  views: string;
  likes: string;
  comments: string;
  snapshot_at: Date;
}

export interface AnalyticsSnapshot {
  id: string;
  contentId: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  snapshotAt: Date;
}
