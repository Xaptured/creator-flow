import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import pgvector from 'pgvector/pg';
import { fromSql } from 'pgvector';

import { ContentEmbeddingDto } from './dto/content-embedding.dto.js';
import { SimilarContentDto } from './dto/similar-content.dto.js';
import { ContentText, ContentTextRow } from './model/content-text.model.js';
import { EmbeddingRow } from './model/embedding-row.model.js';
import { SimilarRow } from './model/similar-row.model.js';
import {
  DELETE_BY_CONTENT_ID,
  FIND_ONE,
  FIND_PUBLISHED_WITHOUT_EMBEDDING,
  FIND_SIMILAR,
  GET_CONTENT_TEXT,
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

  /** Fetch title + description for a single content row (embedding input). */
  async getContentText(contentId: string): Promise<ContentText | null> {
    const { rows } = await this.pool.query<ContentTextRow>(GET_CONTENT_TEXT, [
      contentId,
    ]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      contentId: row.id,
      title: row.title,
      description: row.description,
    };
  }

  /** Page through PUBLISHED content without an embedding for the given model. */
  async findPublishedWithoutEmbedding(
    model: string,
    limit: number,
    offset: number,
  ): Promise<ContentText[]> {
    const { rows } = await this.pool.query<ContentTextRow>(
      FIND_PUBLISHED_WITHOUT_EMBEDDING,
      [model, limit, offset],
    );
    return rows.map((row) => ({
      contentId: row.id,
      title: row.title,
      description: row.description,
    }));
  }

  private mapRow(row: EmbeddingRow): ContentEmbeddingDto {
    return {
      id: row.id,
      contentId: row.content_id,
      embedding: this.parseEmbedding(row.embedding),
      model: row.model,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * pgvector's registerType() is registered on a single pooled connection
   * (client.setTypeParser is per-connection), so the embedding column arrives
   * either pre-parsed (that connection) or as a raw '[...]' string (every
   * other connection). Handle both — calling fromSql on an already-parsed
   * array throws "invalid text representation".
   */
  private parseEmbedding(value: unknown): number[] {
    if (Array.isArray(value)) {
      return value as number[];
    }
    return fromSql(value) as number[];
  }
}
