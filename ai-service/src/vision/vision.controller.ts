import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import type {
  SelectThumbnailRequest,
  SelectThumbnailResponse,
  ThumbnailScoreResponse,
} from './dto/thumbnail-score.response.js';
import { VisionService } from './vision.service.js';

/**
 * CF-96 thumbnail scoring endpoints. ownerId always from the JWT sub —
 * never from the client. Applies to YouTube video posts only (the composer
 * shows the selector solely for YOUTUBE targets); scoring itself is keyed by
 * media file, platform-agnostic at this layer.
 */
@Controller('vision')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CREATOR')
export class VisionController {
  constructor(private readonly visionService: VisionService) {}

  /**
   * GET /api/vision/score-thumbnail/:mediaFileId
   * Poll endpoint for the composer — cheap DB read, no throttle.
   */
  @Get('score-thumbnail/:mediaFileId')
  @HttpCode(HttpStatus.OK)
  getScores(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Param('mediaFileId', ParseUUIDPipe) mediaFileId: string,
  ): Promise<ThumbnailScoreResponse> {
    return this.visionService.getScores(mediaFileId, req.user.sub);
  }

  /**
   * POST /api/vision/score-thumbnail/:mediaFileId
   * Manual retry for FAILED runs — costs a Claude vision call, throttled.
   */
  @Post('score-thumbnail/:mediaFileId')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 10, ttl: 86_400_000 } })
  async retry(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Param('mediaFileId', ParseUUIDPipe) mediaFileId: string,
  ): Promise<void> {
    await this.visionService.retry(mediaFileId, req.user.sub);
  }

  /**
   * POST /api/vision/select-thumbnail
   * Copies the chosen frame to its permanent key; composer stores the
   * returned key on the scheduled post.
   */
  @Post('select-thumbnail')
  @HttpCode(HttpStatus.OK)
  selectThumbnail(
    @Request() req: ExpressRequest & { user: JwtPayload },
    @Body() body: SelectThumbnailRequest,
  ): Promise<SelectThumbnailResponse> {
    if (!body?.mediaFileId || typeof body.frameIndex !== 'number') {
      throw new BadRequestException('mediaFileId and frameIndex are required');
    }
    return this.visionService.selectThumbnail(
      body.mediaFileId,
      body.frameIndex,
      req.user.sub,
    );
  }
}
