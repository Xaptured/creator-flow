import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { JwtPayload } from '../../common/auth/jwt.strategy.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { ContentGap } from '../dto/content-gap.dto.js';
import { isTrendingPlatform } from '../model/raw-trend.model.js';
import { GapService } from './gap.service.js';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CREATOR')
export class GapController {
  constructor(private readonly gapService: GapService) {}

  /**
   * GET /api/ai/content-gaps[?platform=YOUTUBE|INSTAGRAM|TWITTER]
   * Top-5 trending topics in the creator's niche least covered by their
   * catalogue. ownerId comes from the JWT sub — never from the client.
   */
  @Get('content-gaps')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 86_400_000 } })
  getContentGaps(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Query('platform') platform?: string,
  ): Promise<ContentGap[]> {
    if (platform !== undefined && !isTrendingPlatform(platform)) {
      throw new BadRequestException(
        `Unknown platform '${platform}' — expected YOUTUBE | INSTAGRAM | TWITTER`,
      );
    }
    return this.gapService.getGaps(req.user.sub, platform ?? null);
  }
}
