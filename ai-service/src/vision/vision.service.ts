/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { ClaudeService } from '../ai/claude/claude.service.js';
import { PromptService } from '../ai/prompt/prompt.service.js';
import {
  SelectThumbnailResponse,
  ThumbnailFrameDto,
  ThumbnailScoreResponse,
} from './dto/thumbnail-score.response.js';
import {
  ExtractedFrame,
  FrameExtractorService,
} from './frame-extractor.service.js';
import { MediaInternalClient } from './media-internal.client.js';
import {
  ScoredFrame,
  ThumbnailScoreRow,
} from './model/thumbnail-score.model.js';
import { ThumbnailScoreRepository } from './thumbnail-score.repository.js';
import { VideoUploadedEvent } from './video-uploaded.event.js';

const FRAME_MIME = 'image/jpeg';
const MIN_SCORE = 1;
const MAX_SCORE = 10;
const MAX_REASONING_LENGTH = 300;

/**
 * CF-96 thumbnail scoring pipeline (YouTube videos only — media-service emits
 * MEDIA_VIDEO_UPLOADED for video/mp4 uploads exclusively; images and audio
 * never reach this service).
 *
 * Consumes the upload event, extracts 4 frames, uploads them to the temporary
 * thumbnails/ prefix, scores all 4 in one Claude vision call, persists the
 * result. Poll + select endpoints serve the composer UI.
 */
@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);

  constructor(
    private readonly repository: ThumbnailScoreRepository,
    private readonly frameExtractor: FrameExtractorService,
    private readonly mediaClient: MediaInternalClient,
    private readonly claudeService: ClaudeService,
    private readonly promptService: PromptService,
  ) {}

  /** SQS entry point. Idempotent: duplicate deliveries are skipped via DB claim. */
  async processVideo(event: VideoUploadedEvent): Promise<void> {
    const { mediaId, ownerId, s3Key } = event;

    const claimed = await this.repository.claim(mediaId, ownerId, s3Key);
    if (!claimed) {
      this.logger.log(
        `Thumbnail scoring already done/in-flight for mediaId=${mediaId} — skipping`,
      );
      return;
    }

    try {
      await this.repository.markExtracting(mediaId);

      const videoUrl = await this.mediaClient.presignRead(s3Key);
      const frames = await this.frameExtractor.extractFrames(videoUrl);
      const uploaded = await this.uploadFrames(ownerId, mediaId, frames);
      const scored = await this.scoreFrames(frames, uploaded);

      await this.repository.markScored(mediaId, scored);
      this.logger.log(
        `Thumbnail scoring complete for mediaId=${mediaId} — ${scored.length} frames`,
      );
    } catch (err) {
      const message = (err as Error).message ?? 'unknown error';
      this.logger.error(
        `Thumbnail scoring failed for mediaId=${mediaId}: ${message}`,
      );
      await this.repository
        .markFailed(mediaId, message)
        .catch(() =>
          this.logger.error(`Could not mark FAILED for mediaId=${mediaId}`),
        );
    }
  }

  /** Poll endpoint data. Frames get fresh 15-min preview URLs when SCORED. */
  async getScores(
    mediaFileId: string,
    ownerId: string,
  ): Promise<ThumbnailScoreResponse> {
    const row = await this.findOwnedRow(mediaFileId, ownerId);

    const frames: ThumbnailFrameDto[] =
      row.status === 'SCORED' && row.frames
        ? await Promise.all(
            row.frames.map(async (frame) => ({
              frameIndex: frame.frameIndex,
              score: frame.score,
              reasoning: frame.reasoning,
              previewUrl: await this.mediaClient.presignRead(frame.s3Key),
            })),
          )
        : [];

    return {
      mediaFileId,
      status: row.status,
      frames,
      ...(row.error ? { error: row.error } : {}),
    };
  }

  /** Manual re-run — only re-arms FAILED rows (SCORED results are kept). */
  async retry(mediaFileId: string, ownerId: string): Promise<void> {
    const row = await this.findOwnedRow(mediaFileId, ownerId);
    if (row.status !== 'FAILED') {
      throw new ConflictException(
        `Thumbnail scoring is ${row.status} — retry applies to FAILED only`,
      );
    }
    await this.processVideo({
      mediaId: mediaFileId,
      ownerId,
      s3Key: row.media_s3_key,
      fileName: '',
      mimeType: 'video/mp4',
      confirmedAt: new Date().toISOString(),
    });
  }

  /**
   * Promotes the chosen frame from the expiring thumbnails/ prefix to its
   * permanent key. Returned key is what the composer stores on the scheduled
   * post (YouTube targets only).
   */
  async selectThumbnail(
    mediaFileId: string,
    frameIndex: number,
    ownerId: string,
  ): Promise<SelectThumbnailResponse> {
    const row = await this.findOwnedRow(mediaFileId, ownerId);
    if (row.status !== 'SCORED' || !row.frames) {
      throw new ConflictException('Thumbnail scores are not ready yet');
    }
    const frame = row.frames.find((f) => f.frameIndex === frameIndex);
    if (!frame) {
      throw new NotFoundException(`No frame with index ${frameIndex}`);
    }

    const thumbnailS3Key = `uploads/${ownerId}/${mediaFileId}/thumbnail.jpg`;
    await this.mediaClient.copy(frame.s3Key, thumbnailS3Key);
    this.logger.log(
      `Thumbnail selected for mediaId=${mediaFileId} — frame ${frameIndex} → permanent key`,
    );
    return { mediaFileId, thumbnailS3Key };
  }

  /** 404 on missing row OR wrong owner — never leaks other users' media. */
  private async findOwnedRow(
    mediaFileId: string,
    ownerId: string,
  ): Promise<ThumbnailScoreRow> {
    const row = await this.repository.findByMediaFileIdAndOwner(
      mediaFileId,
      ownerId,
    );
    if (!row) {
      throw new NotFoundException('No thumbnail scoring found for this media');
    }
    return row;
  }

  private async uploadFrames(
    ownerId: string,
    mediaId: string,
    frames: ExtractedFrame[],
  ): Promise<string[]> {
    const keys: string[] = [];
    for (const frame of frames) {
      const s3Key = `thumbnails/${ownerId}/${mediaId}/frame-${frame.frameIndex}.jpg`;
      const putUrl = await this.mediaClient.presignWrite(s3Key, FRAME_MIME);
      const response = await fetch(putUrl, {
        method: 'PUT',
        headers: { 'Content-Type': FRAME_MIME },
        body: new Uint8Array(frame.data),
      });
      if (!response.ok) {
        throw new Error(
          `Frame upload failed for ${s3Key} — status ${response.status}`,
        );
      }
      keys.push(s3Key);
    }
    return keys;
  }

  /** One Claude vision call for all frames; parse with one strict retry. */
  private async scoreFrames(
    frames: ExtractedFrame[],
    s3Keys: string[],
  ): Promise<ScoredFrame[]> {
    const images = frames.map((frame) => ({
      mediaType: FRAME_MIME as 'image/jpeg',
      dataBase64: frame.data.toString('base64'),
    }));
    const system = this.promptService.thumbnailScoreSystem();
    const user = this.promptService.buildThumbnailScorePrompt(frames.length);

    const raw = await this.claudeService.completeWithImages(
      system,
      user,
      images,
    );
    const first = this.tryParse(raw, s3Keys);
    if (first !== null) return first;

    this.logger.warn('Thumbnail score parse failed — retrying once');
    const retryRaw = await this.claudeService.completeWithImages(
      system,
      `${user}\n\nIMPORTANT: your previous reply was not valid JSON. Reply with ONLY the JSON object described in the system prompt.`,
      images,
    );
    const second = this.tryParse(retryRaw, s3Keys);
    if (second !== null) return second;

    throw new Error('Claude returned an unparseable thumbnail score response');
  }

  /** Parses `{ frames: [{frameIndex, score, reasoning}] }`; null when malformed. */
  private tryParse(raw: string, s3Keys: string[]): ScoredFrame[] | null {
    try {
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '');
      const parsed = JSON.parse(cleaned) as { frames?: unknown };
      if (!Array.isArray(parsed.frames)) return null;

      const scored = parsed.frames
        .filter(
          (
            item,
          ): item is { frameIndex: number; score: number; reasoning: string } =>
            typeof (item as ScoredFrame)?.frameIndex === 'number' &&
            typeof (item as ScoredFrame)?.score === 'number' &&
            typeof (item as ScoredFrame)?.reasoning === 'string',
        )
        .filter(
          (item) => item.frameIndex >= 0 && item.frameIndex < s3Keys.length,
        )
        .map((item) => ({
          frameIndex: item.frameIndex,
          s3Key: s3Keys[item.frameIndex],
          score: this.clampScore(item.score),
          reasoning: item.reasoning.trim().slice(0, MAX_REASONING_LENGTH),
        }));

      return scored.length === s3Keys.length ? scored : null;
    } catch {
      return null;
    }
  }

  private clampScore(score: number): number {
    return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));
  }
}
