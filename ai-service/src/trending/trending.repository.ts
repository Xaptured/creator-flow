import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import pgvector from 'pgvector/pg';

import { ContentGap } from './dto/content-gap.dto.js';
import { TrendingPlatform } from './model/raw-trend.model.js';
import {
  FallbackRow,
  GapRow,
  TrendingTopicUpsert,
  UserNicheRegionRow,
} from './model/trending-topic-row.model.js';
import {
  FIND_FALLBACK_TOPICS,
  FIND_GAPS,
  HAS_ANY_EMBEDDING,
} from './sql/gap.sql.js';
import {
  DELETE_STALE_TOPICS,
  GET_CREDENTIAL,
  GET_REGIONS_IN_USE,
  GET_USER_NICHE_REGION,
  IS_ACTIVE_REGION,
  UPSERT_CREDENTIAL,
  UPSERT_TRENDING_TOPIC,
} from './sql/trending.sql.js';

/** Sentinel score for fallback rows — creator has no embeddings, so every topic is fully uncovered. */
const FALLBACK_SCORE = 1;

@Injectable()
export class TrendingRepository implements OnModuleInit, OnModuleDestroy {
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

  /** Upsert one refreshed batch. Idempotent — safe to re-run. Returns row count written. */
  async upsertTopics(rows: TrendingTopicUpsert[]): Promise<number> {
    let written = 0;
    for (const row of rows) {
      await this.pool.query(UPSERT_TRENDING_TOPIC, [
        row.platform,
        row.topic,
        row.sourceRef,
        row.niche,
        pgvector.toSql(row.embedding),
        row.model,
        row.region,
      ]);
      written += 1;
    }
    return written;
  }

  /** Max-of-min gap query. Empty result for creators with no embeddings — use fallback. */
  async findGaps(
    model: string,
    ownerId: string,
    niche: string,
    platform: TrendingPlatform | null,
    region: string,
    freshnessHours: number,
  ): Promise<ContentGap[]> {
    const { rows } = await this.pool.query<GapRow>(FIND_GAPS, [
      model,
      ownerId,
      niche,
      platform,
      region,
      freshnessHours,
    ]);
    return rows.map((row) => ({
      topic: row.topic,
      platform: row.platform,
      score: parseFloat(row.nearest_distance),
    }));
  }

  /** Freshest niche-matched topics — everything is a gap for an empty catalogue. */
  async findFallbackTopics(
    model: string,
    niche: string,
    platform: TrendingPlatform | null,
    region: string,
    freshnessHours: number,
  ): Promise<ContentGap[]> {
    const { rows } = await this.pool.query<FallbackRow>(FIND_FALLBACK_TOPICS, [
      model,
      niche,
      platform,
      region,
      freshnessHours,
    ]);
    return rows.map((row) => ({
      topic: row.topic,
      platform: row.platform,
      score: FALLBACK_SCORE,
    }));
  }

  async hasAnyEmbedding(ownerId: string, model: string): Promise<boolean> {
    const { rows } = await this.pool.query(HAS_ANY_EMBEDDING, [ownerId, model]);
    return rows.length > 0;
  }

  async getUserNicheRegion(
    ownerId: string,
  ): Promise<UserNicheRegionRow | null> {
    const { rows } = await this.pool.query<UserNicheRegionRow>(
      GET_USER_NICHE_REGION,
      [ownerId],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async isActiveRegion(region: string): Promise<boolean> {
    const { rows } = await this.pool.query(IS_ACTIVE_REGION, [region]);
    return rows.length > 0;
  }

  /** Delete topics not refreshed within the retention window. Returns rows removed. */
  async deleteStaleTopics(retentionDays: number): Promise<number> {
    const result = await this.pool.query(DELETE_STALE_TOPICS, [retentionDays]);
    return result.rowCount ?? 0;
  }

  /** App-level platform credential (secret — never log the value). */
  async getCredential(key: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ value: string }>(GET_CREDENTIAL, [
      key,
    ]);
    return rows.length > 0 ? rows[0].value : null;
  }

  async setCredential(key: string, value: string): Promise<void> {
    await this.pool.query(UPSERT_CREDENTIAL, [key, value]);
  }

  /** Distinct regions chosen by users (default region unioned in by the caller). */
  async getRegionsInUse(): Promise<string[]> {
    const { rows } = await this.pool.query<{ region: string }>(
      GET_REGIONS_IN_USE,
    );
    return rows.map((row) => row.region);
  }
}
