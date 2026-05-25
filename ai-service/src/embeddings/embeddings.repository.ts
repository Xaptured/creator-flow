import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import pgvector from 'pgvector/pg';
import { fromSql } from 'pgvector';

import { ContentEmbeddingDto } from './dto/content-embedding.dto.js';
import { SimilarContentDto } from './dto/similar-content.dto.js';
import { EmbeddingRow } from './model/embedding-row.model.js';
import { SimilarRow } from './model/similar-row.model.js';
import {
  DELETE_BY_CONTENT_ID,
  FIND_ONE,
  FIND_SIMILAR,
  UPSERT_EMBEDDING,
} from './sql/embeddings.sql.js';

@Injectable()
export class EmbeddingsRepository implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
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
      max: 10,
      idleTimeoutMillis: 30_000,
    });

    const client: PoolClient = await this.pool.connect();
    try {
      await pgvector.registerType(client);
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async upsert(
    contentId: string,
    model: string,
    embedding: number[],
  ): Promise<ContentEmbeddingDto> {
    const { rows } = await this.pool.query<EmbeddingRow>(UPSERT_EMBEDDING, [
      contentId,
      pgvector.toSql(embedding),
      model,
    ]);
    return this.mapRow(rows[0]);
  }

  async findSimilar(
    queryEmbedding: number[],
    model: string,
    topK: number = 10,
  ): Promise<SimilarContentDto[]> {
    const { rows } = await this.pool.query<SimilarRow>(FIND_SIMILAR, [
      pgvector.toSql(queryEmbedding),
      model,
      topK,
    ]);
    return rows.map((row) => ({
      contentId: row.content_id,
      distance: parseFloat(row.distance),
    }));
  }

  async deleteByContentId(contentId: string): Promise<void> {
    await this.pool.query(DELETE_BY_CONTENT_ID, [contentId]);
  }

  async findOne(
    contentId: string,
    model: string,
  ): Promise<ContentEmbeddingDto | null> {
    const { rows } = await this.pool.query<EmbeddingRow>(FIND_ONE, [
      contentId,
      model,
    ]);
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  private mapRow(row: EmbeddingRow): ContentEmbeddingDto {
    return {
      id: row.id,
      contentId: row.content_id,
      embedding: fromSql(row.embedding) as number[],
      model: row.model,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
