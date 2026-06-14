export type VolumeCategory = 'high' | 'mid' | 'niche';

export interface HashtagItem {
  hashtag: string;
  volumeCategory: VolumeCategory;
}

export interface HashtagResponse {
  hashtags: HashtagItem[];
}
