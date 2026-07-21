import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';

import { JwtAuthGuard } from '../common/auth/jwt-auth.guard.js';
import { JwtPayload } from '../common/auth/jwt.strategy.js';
import { Roles } from '../common/auth/roles.decorator.js';
import { RolesGuard } from '../common/auth/roles.guard.js';
import { isTrendingPlatform } from '../trending/model/raw-trend.model.js';
import { AiService } from './ai.service.js';
import { BestTimeService } from './best-time/best-time.service.js';
import { BestTimeResponse } from './best-time/dto/best-time.response.js';
import { CommentDigestService } from './comment-digest/comment-digest.service.js';
import { CommentDigestResponse } from './comment-digest/dto/comment-digest.response.js';
import type { CaptionRequest } from './dto/request/caption.request.js';
import type { HashtagRequest } from './dto/request/hashtag.request.js';
import { CaptionResponse } from './dto/response/caption.response.js';
import { HashtagResponse } from './dto/response/hashtag.response.js';
import { InsightsResponse } from './dto/response/insight.response.js';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CREATOR')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly bestTimeService: BestTimeService,
    private readonly commentDigestService: CommentDigestService,
  ) {}

  /**
   * GET /api/ai/best-time[?platform=YOUTUBE|INSTAGRAM|TWITTER]
   * Engagement-ranked posting slots in the creator's timezone + Claude
   * narrative. ownerId from the JWT sub - never from the client.
   */
  @Get('best-time')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 86_400_000 } })
  getBestTime(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Query('platform') platform?: string,
  ): Promise<BestTimeResponse> {
    if (platform !== undefined && !isTrendingPlatform(platform)) {
      throw new BadRequestException(
        `Unknown platform '${platform}' - expected YOUTUBE | INSTAGRAM | TWITTER`,
      );
    }
    return this.bestTimeService.getBestTime(req.user.sub, platform ?? null);
  }

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

  /**
   * POST /api/ai/comment-digest
   * Top audience questions + content ideas from recent channel-wide YouTube
   * comments. ownerId from the JWT sub. The caller's Bearer token is forwarded
   * to analytics-service (which owns the YouTube OAuth token) — ai-service
   * never touches platform tokens. Empty body.
   */
  @Post('comment-digest')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 86_400_000 } })
  generateCommentDigest(
    @Request() req: ExpressRequest & { user: JwtPayload },
  ): Promise<CommentDigestResponse> {
    const accessToken = extractBearerToken(req.headers.authorization);
    return this.commentDigestService.generateDigest(req.user.sub, accessToken);
  }
}

/** "Bearer <token>" → "<token>"; guard has already validated the JWT. */
function extractBearerToken(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Missing Bearer token');
  }
  return header.slice('Bearer '.length);
}
