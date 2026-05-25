/** Raw row shape returned by pg for cosine-distance similarity queries. */
export interface SimilarRow {
  content_id: string;
  distance: string;
}
