export type CaptionTone = 'professional' | 'casual' | 'hype' | 'informative';

export interface CaptionVariant {
  tone: CaptionTone;
  caption: string;
}

export interface CaptionResponse {
  captions: CaptionVariant[];
}
