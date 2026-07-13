import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { ClaudeService } from '../ai/claude/claude.service.js';
import { AuthModule } from '../common/auth/auth.module.js';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { InstagramTrendingClient } from './clients/instagram-trending.client.js';
import { XTrendingClient } from './clients/x-trending.client.js';
import { YoutubeTrendingClient } from './clients/youtube-trending.client.js';
import { GapController } from './gap/gap.controller.js';
import { GapService } from './gap/gap.service.js';
import { TopicNormalizerService } from './normalizer/topic-normalizer.service.js';
import { TrendingController } from './trending.controller.js';
import { TrendingRefreshService } from './trending-refresh.service.js';
import { TrendingRepository } from './trending.repository.js';
import { TrendingService } from './trending.service.js';

@Module({
  imports: [
    AuthModule,
    EmbeddingsModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 86_400_000,
        limit: 100,
      },
    ]),
  ],
  controllers: [TrendingController, GapController],
  providers: [
    TrendingRepository,
    TrendingService,
    TrendingRefreshService,
    TopicNormalizerService,
    YoutubeTrendingClient,
    XTrendingClient,
    InstagramTrendingClient,
    GapService,
    ClaudeService,
  ],
})
export class TrendingModule {}
