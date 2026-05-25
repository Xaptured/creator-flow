import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.local',
      isGlobal: true,
    }),
    AnalyticsModule,
    AiModule,
    EmbeddingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
