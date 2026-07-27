import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

import {
  ScoredFrame,
  ThumbnailScoreRow,
} from './model/thumbnail-score.model.js';
import {
  FIND_BY_MEDIA_AND_OWNER,
  INSERT_PENDING,
  MARK_EXTRACTING,
  MARK_FAILED,
  MARK_SCORED,
  RESET_FAILED_TO_PENDING,
} from './sql/thumbnail-scores.sql.js';

/**
 * Raw-SQL repository for thumbnail_scores (same pg pattern as
 * EmbeddingsRepository). Schema owned by db-migrations (V10).
 */
@Injectable()
export class ThumbnailScoreRepository implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.pool = new Pool({
      host: this.config.getOrThrow<string>('DB_HOST'),
      port: this.config.get<number>('DB_PORT', 5432),
      database: this.config.getOrThrow<string>('DB_NAME'),
      user: this.config.getOrThrow<string>('DB_USERNAME'),
      password: this.config.getOrThrow<string>('DB_PASSWORD'),
      ssl:
        this.config.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Claims the job for processing. Returns true when this caller owns the run:
   * either a fresh row was inserted, or a FAILED row was re-armed.
   * False → another delivery already processed / is processing this media file.
   */
  async claim(
    mediaFileId: string,
    ownerId: string,
    mediaS3Key: string,
  ): Promise<boolean> {
    const inserted = await this.pool.query(INSERT_PENDING, [
      randomUUID(),
      mediaFileId,
      ownerId,
      mediaS3Key,
    ]);
    if (inserted.rowCount && inserted.rowCount > 0) {
      return true;
    }
    const reset = await this.pool.query(RESET_FAILED_TO_PENDING, [mediaFileId]);
    return Boolean(reset.rowCount && reset.rowCount > 0);
  }

  async markExtracting(mediaFileId: string): Promise<void> {
    await this.pool.query(MARK_EXTRACTING, [mediaFileId]);
  }

  async markScored(mediaFileId: string, frames: ScoredFrame[]): Promise<void> {
    await this.pool.query(MARK_SCORED, [mediaFileId, JSON.stringify(frames)]);
  }

  async markFailed(mediaFileId: string, error: string): Promise<void> {
    await this.pool.query(MARK_FAILED, [mediaFileId, error.slice(0, 2000)]);
  }

  async findByMediaFileIdAndOwner(
    mediaFileId: string,
    ownerId: string,
  ): Promise<ThumbnailScoreRow | null> {
    const { rows } = await this.pool.query<ThumbnailScoreRow>(
      FIND_BY_MEDIA_AND_OWNER,
      [mediaFileId, ownerId],
    );
    return rows[0] ?? null;
  }
}
