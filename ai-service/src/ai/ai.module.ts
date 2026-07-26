import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { AnalyticsModule } from '../analytics/analytics.module.js';
import { AuthModule } from '../common/auth/auth.module.js';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { VisionModule } from '../vision/vision.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { BestTimeService } from './best-time/best-time.service.js';
import { ClaudeService } from './claude/claude.service.js';
import { AnalyticsCommentsClient } from './comment-digest/analytics-comments.client.js';
import { CommentDigestService } from './comment-digest/comment-digest.service.js';
import { PromptService } from './prompt/prompt.service.js';
import { SqsConsumerService } from './sqs/sqs-consumer.service.js';

@Module({
  imports: [
    AnalyticsModule,
    AuthModule,
    EmbeddingsModule,
    VisionModule,
    ThrottlerModule.forRoot([
      {
        ttl: 86_400_000,
        limit: 10,
      },
    ]),
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AnalyticsCommentsClient,
    BestTimeService,
    ClaudeService,
    CommentDigestService,
    PromptService,
    SqsConsumerService,
  ],
  exports: [AiService],
})
export class AiModule {}
