import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

import type { IngestAnalyticsRequest } from './dto/ingest-analytics.request.js';
import type { IngestAnalyticsResponse } from './dto/ingest-analytics.response.js';
import type { SnapshotRow } from './model/snapshot-row.model.js';
import { INSERT_SNAPSHOT } from './sql/analytics.sql.js';

@Injectable()
export class AnalyticsRepository implements OnModuleInit, OnModuleDestroy {
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
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async insertSnapshot(
    req: IngestAnalyticsRequest,
  ): Promise<IngestAnalyticsResponse> {
    const { rows } = await this.pool.query<SnapshotRow>(INSERT_SNAPSHOT, [
      req.contentId,
      req.platform,
      req.views,
      req.likes,
      req.comments,
      req.snapshotAt ?? null,
    ]);
    return this.mapRow(rows[0]);
  }

  private mapRow(row: SnapshotRow): IngestAnalyticsResponse {
    return {
      id: row.id,
      contentId: row.content_id,
      platform: row.platform,
      views: parseInt(row.views, 10),
      likes: parseInt(row.likes, 10),
      comments: parseInt(row.comments, 10),
      snapshotAt: row.snapshot_at,
    };
  }
}
