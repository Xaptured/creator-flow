import { Module } from '@nestjs/common';

import { AnalyticsRepository } from './analytics.repository.js';

@Module({
  providers: [AnalyticsRepository],
  exports: [AnalyticsRepository],
})
export class AnalyticsModule {}
