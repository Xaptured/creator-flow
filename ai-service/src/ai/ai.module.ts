import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { AnalyticsModule } from '../analytics/analytics.module.js';
import { AuthModule } from '../common/auth/auth.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { ClaudeService } from './claude/claude.service.js';
import { PromptService } from './prompt/prompt.service.js';
import { SqsConsumerService } from './sqs/sqs-consumer.service.js';

@Module({
  imports: [
    AnalyticsModule,
    AuthModule,
    ThrottlerModule.forRoot([
      {
        ttl: 86_400_000,
        limit: 10,
      },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService, ClaudeService, PromptService, SqsConsumerService],
  exports: [AiService],
})
export class AiModule {}
