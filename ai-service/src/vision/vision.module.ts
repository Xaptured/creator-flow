import { Module } from '@nestjs/common';

import { VisionController } from './vision.controller.js';
import { VisionService } from './vision.service.js';

@Module({
  controllers: [VisionController],
  providers: [VisionService],
  exports: [VisionService],
})
export class VisionModule {}
