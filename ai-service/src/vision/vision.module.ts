import { Module } from '@nestjs/common';

import { ClaudeService } from '../ai/claude/claude.service.js';
import { PromptService } from '../ai/prompt/prompt.service.js';
import { AuthModule } from '../common/auth/auth.module.js';
import { FrameExtractorService } from './frame-extractor.service.js';
import { MediaInternalClient } from './media-internal.client.js';
import { ThumbnailScoreRepository } from './thumbnail-score.repository.js';
import { VisionController } from './vision.controller.js';
import { VisionService } from './vision.service.js';

/**
 * CF-96 thumbnail scoring (Vision AI).
 *
 * ClaudeService and PromptService are provided here as well as in AiModule —
 * both are stateless, and re-providing them avoids an AiModule↔VisionModule
 * import cycle (AiModule imports VisionModule for the SQS consumer).
 */
@Module({
  imports: [AuthModule],
  controllers: [VisionController],
  providers: [
    ClaudeService,
    FrameExtractorService,
    MediaInternalClient,
    PromptService,
    ThumbnailScoreRepository,
    VisionService,
  ],
  exports: [VisionService],
})
export class VisionModule {}
