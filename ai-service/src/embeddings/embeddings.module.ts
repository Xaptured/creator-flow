import { Module } from '@nestjs/common';
import { EmbeddingsController } from './embeddings.controller.js';
import { EmbeddingsService } from './embeddings.service.js';

@Module({
  controllers: [EmbeddingsController],
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
