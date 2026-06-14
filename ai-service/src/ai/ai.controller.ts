import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';

import { JwtAuthGuard } from '../common/auth/jwt-auth.guard.js';
import { JwtPayload } from '../common/auth/jwt.strategy.js';
import { Roles } from '../common/auth/roles.decorator.js';
import { RolesGuard } from '../common/auth/roles.guard.js';
import { AiService } from './ai.service.js';
import type { CaptionRequest } from './dto/request/caption.request.js';
import type { HashtagRequest } from './dto/request/hashtag.request.js';
import { CaptionResponse } from './dto/response/caption.response.js';
import { HashtagResponse } from './dto/response/hashtag.response.js';
import { InsightsResponse } from './dto/response/insight.response.js';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CREATOR')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('insights')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 86_400_000 } })
  getInsights(
    @Request() req: ExpressRequest & { user: JwtPayload },
  ): Promise<InsightsResponse> {
    return this.aiService.getInsights(req.user.sub);
  }

  @Post('caption')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 86_400_000 } })
  generateCaptions(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Body() body: Omit<CaptionRequest, 'ownerId'>,
  ): Promise<CaptionResponse> {
    return this.aiService.generateCaptions({ ...body, ownerId: req.user.sub });
  }

  @Post('hashtags')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 86_400_000 } })
  generateHashtags(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Body() body: Omit<HashtagRequest, 'ownerId'>,
  ): Promise<HashtagResponse> {
    return this.aiService.generateHashtags({ ...body, ownerId: req.user.sub });
  }
}
