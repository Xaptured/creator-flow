import { Controller } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service.js';

@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}
}
