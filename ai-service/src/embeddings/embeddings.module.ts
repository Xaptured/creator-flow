import { Module } from '@nestjs/common';
import { EmbeddingsController } from './embeddings.controller.js';
import { EmbeddingsRepository } from './embeddings.repository.js';
import { EmbeddingsService } from './embeddings.service.js';
import { EmbeddingProviderService } from './provider/embedding-provider.service.js';

@Module({
  controllers: [EmbeddingsController],
  providers: [
    EmbeddingsRepository,
    EmbeddingsService,
    EmbeddingProviderService,
  ],
  exports: [EmbeddingsService, EmbeddingProviderService],
})
export class EmbeddingsModule {}
