import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AiModule } from './ai/ai.module.js';
import { AuthModule } from './common/auth/auth.module.js';
import { EmbeddingsModule } from './embeddings/embeddings.module.js';
import { VisionModule } from './vision/vision.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.local',
      isGlobal: true,
    }),
    AuthModule,
    AnalyticsModule,
    AiModule,
    EmbeddingsModule,
    VisionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
