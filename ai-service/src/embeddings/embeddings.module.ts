import { Module } from '@nestjs/common';
import { EmbeddingsController } from './embeddings.controller.js';
import { EmbeddingsRepository } from './embeddings.repository.js';
import { EmbeddingsService } from './embeddings.service.js';

@Module({
  controllers: [EmbeddingsController],
  providers: [EmbeddingsRepository, EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
