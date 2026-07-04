/** Raw row shape for content text fetched to build embeddings. */
export interface ContentTextRow {
  id: string;
  title: string;
  description: string | null;
}

/** Content text composed for embedding input. */
export interface ContentText {
  contentId: string;
  title: string;
  description: string | null;
}
