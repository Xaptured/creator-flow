import { Injectable } from '@nestjs/common';

import { ContentEmbeddingDto } from './dto/content-embedding.dto.js';
import { SimilarContentDto } from './dto/similar-content.dto.js';
import { EmbeddingsRepository } from './embeddings.repository.js';

@Injectable()
export class EmbeddingsService {
  constructor(private readonly embeddingsRepository: EmbeddingsRepository) {}

  upsert(
    contentId: string,
    model: string,
    embedding: number[],
  ): Promise<ContentEmbeddingDto> {
    return this.embeddingsRepository.upsert(contentId, model, embedding);
  }

  findSimilar(
    queryEmbedding: number[],
    model: string,
    topK: number = 10,
  ): Promise<SimilarContentDto[]> {
    return this.embeddingsRepository.findSimilar(queryEmbedding, model, topK);
  }

  deleteByContentId(contentId: string): Promise<void> {
    return this.embeddingsRepository.deleteByContentId(contentId);
  }

  findOne(
    contentId: string,
    model: string,
  ): Promise<ContentEmbeddingDto | null> {
    return this.embeddingsRepository.findOne(contentId, model);
  }
}
