import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Frame positions as fractions of video duration (CF-96 ticket: 10/25/50/75%). */
export const FRAME_POSITIONS = [0.1, 0.25, 0.5, 0.75] as const;

// YouTube thumbnail spec: 1280×720, 16:9. Every frame is normalised to this —
// scale to cover, then centre-crop — so portrait/vertical videos never produce
// narrow frames.
const THUMB_WIDTH = 1280;
const THUMB_HEIGHT = 720;
const JPEG_QUALITY = 4; // ffmpeg -q:v scale: 2 (best) … 31 (worst)
const EXTRACT_TIMEOUT_MS = 60_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;

export interface ExtractedFrame {
  frameIndex: number;
  data: Buffer;
}

/**
 * Downloads a video (presigned URL) and extracts 4 JPEG frames with ffmpeg.
 *
 * Calls the ffmpeg / ffprobe binaries directly via child_process — no wrapper
 * dependency. Binary paths configurable via FFMPEG_PATH / FFPROBE_PATH
 * (default: resolve from system PATH; point at ffmpeg-static binaries in
 * Lambda bundles). Temp files always cleaned up in `finally`.
 */
@Injectable()
export class FrameExtractorService {
  private readonly logger = new Logger(FrameExtractorService.name);
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;

  constructor(config: ConfigService) {
    this.ffmpegPath = config.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.ffprobePath = config.get<string>('FFPROBE_PATH', 'ffprobe');
  }

  /** Downloads the video and returns 4 resized JPEG frames (index 0–3). */
  async extractFrames(videoUrl: string): Promise<ExtractedFrame[]> {
    const workDir = await mkdtemp(join(tmpdir(), 'cf-vision-'));
    const videoPath = join(workDir, 'video.mp4');
    try {
      await this.download(videoUrl, videoPath);
      const duration = await this.probeDuration(videoPath);

      const frames: ExtractedFrame[] = [];
      for (const [frameIndex, position] of FRAME_POSITIONS.entries()) {
        const framePath = join(workDir, `frame-${frameIndex}.jpg`);
        await this.extractSingleFrame(
          videoPath,
          duration * position,
          framePath,
        );
        frames.push({ frameIndex, data: await readFile(framePath) });
      }
      return frames;
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => {
        this.logger.warn(`Temp cleanup failed for ${workDir}`);
      });
    }
  }

  private async download(url: string, destPath: string): Promise<void> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok || !response.body) {
      throw new Error(`Video download failed — status ${response.status}`);
    }
    await pipeline(
      Readable.fromWeb(response.body as never),
      createWriteStream(destPath),
    );
  }

  /** Video duration in seconds via ffprobe. */
  private async probeDuration(videoPath: string): Promise<number> {
    const { stdout } = await execFileAsync(
      this.ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath,
      ],
      { timeout: EXTRACT_TIMEOUT_MS },
    );
    const duration = Number.parseFloat(stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error(`ffprobe returned invalid duration: "${stdout.trim()}"`);
    }
    return duration;
  }

  /**
   * One frame at `timestampSeconds`, normalised to 1280×720 (YouTube thumbnail
   * spec): scale up to cover the 16:9 box, then centre-crop the overflow.
   * JPEG output. `-ss` before `-i` = fast keyframe seek.
   */
  private async extractSingleFrame(
    videoPath: string,
    timestampSeconds: number,
    outputPath: string,
  ): Promise<void> {
    await execFileAsync(
      this.ffmpegPath,
      [
        '-ss',
        timestampSeconds.toFixed(2),
        '-i',
        videoPath,
        '-frames:v',
        '1',
        '-vf',
        `scale=${THUMB_WIDTH}:${THUMB_HEIGHT}:force_original_aspect_ratio=increase,crop=${THUMB_WIDTH}:${THUMB_HEIGHT}`,
        '-q:v',
        String(JPEG_QUALITY),
        '-y',
        outputPath,
      ],
      { timeout: EXTRACT_TIMEOUT_MS },
    );
  }
}
