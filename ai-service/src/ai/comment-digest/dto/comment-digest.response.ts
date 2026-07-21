/** One audience question distilled from recent comments, with a content idea. */
export interface CommentDigestItem {
  question: string;
  idea: string;
}

export interface CommentDigestResponse {
  ownerId: string;
  /** Up to 5 items; empty when the channel has no recent comments. */
  items: CommentDigestItem[];
  /** How many comments were analysed (0 → Claude was not called). */
  commentCount: number;
  generatedAt: string;
}
