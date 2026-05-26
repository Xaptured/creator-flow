import { Injectable } from '@nestjs/common';

import { AnalyticsService } from '../analytics/analytics.service.js';

@Injectable()
export class AiService {
  constructor(private readonly analyticsService: AnalyticsService) {}
}
