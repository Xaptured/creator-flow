/** Raw row shape returned by pg for the content_embeddings table. */
export interface EmbeddingRow {
  id: string;
  content_id: string;
  embedding: string;
  model: string;
  created_at: Date;
  updated_at: Date;
}
