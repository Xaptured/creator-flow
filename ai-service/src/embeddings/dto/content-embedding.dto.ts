export interface ContentEmbeddingDto {
  id: string;
  contentId: string;
  embedding: number[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
}
