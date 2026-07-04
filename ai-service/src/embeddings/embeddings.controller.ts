import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard.js';
import { BackfillResult, EmbeddingsService } from './embeddings.service.js';

@Controller('embeddings')
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  /**
   * One-time backfill of embeddings for all pre-existing PUBLISHED content.
   * Internal/admin only — guarded by the x-internal-api-key header.
   * Idempotent and safe to re-run.
   */
  @Post('backfill')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  backfill(): Promise<BackfillResult> {
    return this.embeddingsService.backfill();
  }
}
