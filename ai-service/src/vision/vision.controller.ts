import { Controller } from '@nestjs/common';

import { VisionService } from './vision.service.js';

@Controller('vision')
export class VisionController {
  constructor(private readonly visionService: VisionService) {}
}
