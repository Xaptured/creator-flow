import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { SqsConsumerService } from './sqs/sqs-consumer.service.js';

@Module({
  imports: [AnalyticsModule],
  controllers: [AiController],
  providers: [AiService, SqsConsumerService],
  exports: [AiService],
})
export class AiModule {}
