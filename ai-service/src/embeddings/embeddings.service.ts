import { Injectable, Logger } from '@nestjs/common';

import { ContentEmbeddingDto } from './dto/content-embedding.dto.js';
import { SimilarContentDto } from './dto/similar-content.dto.js';
import { ContentText } from './model/content-text.model.js';
import { EmbeddingProviderService } from './provider/embedding-provider.service.js';
import { EmbeddingsRepository } from './embeddings.repository.js';

export interface BackfillResult {
  processed: number;
  skipped: number;
  failed: number;
}

/** How many content rows to embed per backfill page. */
const BACKFILL_PAGE_SIZE = 100;

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(
    private readonly embeddingsRepository: EmbeddingsRepository,
    private readonly provider: EmbeddingProviderService,
  ) {}

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

  /**
   * Generate and store an embedding for a single content row.
   * Called from the SQS pipeline on `analytics.updated`. Returns null (skip)
   * when the content has no usable text — keeps the pipeline resilient.
   */
  async embedContent(contentId: string): Promise<ContentEmbeddingDto | null> {
    const content = await this.embeddingsRepository.getContentText(contentId);
    if (!content) {
      this.logger.warn(`Skip embed — content not found: ${contentId}`);
      return null;
    }

    const text = this.composeText(content);
    if (!text) {
      this.logger.warn(`Skip embed — empty text for content: ${contentId}`);
      return null;
    }

    const vector = await this.provider.embed(text);
    const dto = await this.embeddingsRepository.upsert(
      contentId,
      this.provider.modelName,
      vector,
    );
    this.logger.log(`Embedded content ${contentId} (model=${dto.model})`);
    return dto;
  }

  /**
   * One-time backfill: embed all PUBLISHED content lacking an embedding for the
   * current model. Idempotent and re-runnable (the query skips already-embedded
   * rows; upsert is conflict-safe).
   */
  async backfill(): Promise<BackfillResult> {
    const model = this.provider.modelName;
    const result: BackfillResult = { processed: 0, skipped: 0, failed: 0 };

    // Always page from offset 0: embedded rows drop out of the result set as we
    // go, so the next page naturally holds the next unembedded batch.
    for (;;) {
      const batch =
        await this.embeddingsRepository.findPublishedWithoutEmbedding(
          model,
          BACKFILL_PAGE_SIZE,
          0,
        );
      if (batch.length === 0) break;

      const before = result.processed + result.skipped;
      await this.embedBatch(batch, result);

      // Guard against an infinite loop if a whole batch errors out.
      if (result.processed + result.skipped === before) {
        this.logger.error(
          `Backfill stalled — ${batch.length} rows made no progress; aborting`,
        );
        break;
      }
    }

    this.logger.log(
      `Backfill done — processed=${result.processed} skipped=${result.skipped} failed=${result.failed}`,
    );
    return result;
  }

  private async embedBatch(
    batch: ContentText[],
    result: BackfillResult,
  ): Promise<void> {
    const model = this.provider.modelName;
    const items = batch
      .map((c) => ({ contentId: c.contentId, text: this.composeText(c) }))
      .filter((c): c is { contentId: string; text: string } => {
        if (!c.text) {
          result.skipped += 1;
          return false;
        }
        return true;
      });

    if (items.length === 0) return;

    try {
      const vectors = await this.provider.embedBatch(items.map((i) => i.text));
      for (let i = 0; i < items.length; i += 1) {
        await this.embeddingsRepository.upsert(
          items[i].contentId,
          model,
          vectors[i],
        );
        result.processed += 1;
      }
    } catch (err) {
      result.failed += items.length;
      this.logger.error(`Batch embed failed for ${items.length} rows`, err);
    }
  }

  private composeText(content: ContentText): string {
    return `${content.title}\n\n${content.description ?? ''}`.trim();
  }
}
