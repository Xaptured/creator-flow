import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const PRESIGN_READ_PATH = '/internal/media/presign-read';
const PRESIGN_WRITE_PATH = '/internal/media/presign-write';
const COPY_PATH = '/internal/media/copy';
const DEFAULT_MEDIA_URL = 'http://localhost:8082/creator-flow/media';
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Client for media-service's internal S3 broker endpoints (CF-96).
 *
 * ai-service holds no AWS S3 credentials — it obtains short-lived presigned
 * URLs from media-service instead. Authenticated with the shared
 * X-Internal-Secret header (same model as other service-to-service calls).
 *
 * Unlike the analytics comments client, failures here THROW — the vision
 * pipeline must mark the job FAILED rather than silently produce nothing.
 */
@Injectable()
export class MediaInternalClient {
  private readonly logger = new Logger(MediaInternalClient.name);
  private readonly baseUrl: string;
  private readonly internalSecret: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('MEDIA_SERVICE_URL', DEFAULT_MEDIA_URL);
    this.internalSecret = config.getOrThrow<string>('MEDIA_INTERNAL_SECRET');
  }

  /** 15-min presigned GET for an existing object. */
  async presignRead(s3Key: string): Promise<string> {
    const body = await this.post<{ url: string }>(PRESIGN_READ_PATH, { s3Key });
    return body.url;
  }

  /** 15-min presigned PUT for a new object. */
  async presignWrite(s3Key: string, mimeType: string): Promise<string> {
    const body = await this.post<{ url: string }>(PRESIGN_WRITE_PATH, {
      s3Key,
      mimeType,
    });
    return body.url;
  }

  /** Server-side copy (winner frame → permanent key). */
  async copy(sourceKey: string, destKey: string): Promise<void> {
    await this.post<void>(COPY_PATH, { sourceKey, destKey }, true);
  }

  private async post<T>(
    path: string,
    payload: Record<string, string>,
    expectEmpty = false,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': this.internalSecret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      this.logger.error(
        `media-service internal call failed — ${path} status ${response.status}`,
      );
      throw new Error(`media-service ${path} returned ${response.status}`);
    }
    if (expectEmpty) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}
