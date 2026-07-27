import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmbeddingsService } from '../../embeddings/embeddings.service.js';
import { VisionService } from '../../vision/vision.service.js';
import {
  EVENT_ANALYTICS_UPDATED,
  EVENT_VIDEO_UPLOADED,
  VideoUploadedEvent,
} from '../../vision/video-uploaded.event.js';
import {
  AnalyticsEventMessage,
  AnalyticsUpdatedEvent,
  SnsEnvelope,
} from './analytics-updated.event.js';
import { DEFAULTS, ENV } from './sqs.constants.js';

/**
 * Long-polling SQS consumer for the `ai-processing-queue`.
 *
 * Listens for `analytics.updated` events published by analytics-service and
 * hands them off to the embedding pipeline.  The polling loop runs in the
 * background via a non-blocking async loop started in `onModuleInit`.
 *
 * In Lambda the module still initialises (cold-start), but the loop is a no-op
 * because Lambda invocations are event-driven — keep-alive polling is only
 * meaningful in local / ECS environments.  The DISABLE_SQS_POLLING env var
 * allows Lambda deployments to skip the loop entirely.
 */
@Injectable()
export class SqsConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsConsumerService.name);
  private readonly client: SQSClient;
  private readonly queueUrl: string;
  private readonly pollingDisabled: boolean;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly visionService: VisionService,
  ) {
    const region = this.config.get<string>(ENV.AWS_REGION, DEFAULTS.AWS_REGION);
    const endpoint = this.config.get<string>(ENV.AWS_SQS_ENDPOINT);
    this.client = new SQSClient({
      region,
      ...(endpoint ? { endpoint } : {}),
    });
    this.queueUrl = this.config.getOrThrow<string>(ENV.AI_PROCESSING_QUEUE_URL);
    this.pollingDisabled =
      this.config.get<string>(ENV.DISABLE_SQS_POLLING) === 'true';
  }

  onModuleInit(): void {
    if (this.pollingDisabled) {
      this.logger.log('SQS polling disabled (DISABLE_SQS_POLLING=true)');
      return;
    }
    this.running = true;
    void this.poll();
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  /**
   * Receive a batch of messages (up to 10) with a 20-second long-poll wait.
   * Each message is processed and deleted before the next batch is fetched.
   */
  private async poll(): Promise<void> {
    while (this.running) {
      try {
        const response = await this.client.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
          }),
        );

        const messages = response.Messages ?? [];
        for (const message of messages) {
          await this.handleMessage(message);
        }
      } catch (err) {
        this.logger.error('SQS poll error', err);
        // Back off briefly on transient errors to avoid a tight error loop.
        await this.sleep(5_000);
      }
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    const msgId = message.MessageId ?? 'unknown';
    try {
      const envelope = this.unwrapEnvelope(message);
      if (!envelope) {
        // Unparseable — delete so it doesn't loop forever.
        await this.deleteMessage(message);
        return;
      }

      switch (envelope.eventType) {
        case EVENT_ANALYTICS_UPDATED: {
          const event = this.parseAnalyticsEvent(envelope, msgId);
          if (event) {
            this.logger.log(
              `analytics.updated received — ownerId=${event.ownerId} contentId=${event.contentId} platform=${event.platform}`,
            );
            await this.triggerEmbeddingPipeline(event);
          }
          break;
        }
        case EVENT_VIDEO_UPLOADED: {
          const event = this.parseVideoUploadedEvent(envelope, msgId);
          if (event) {
            this.logger.log(
              `MEDIA_VIDEO_UPLOADED received — ownerId=${event.ownerId} mediaId=${event.mediaId}`,
            );
            await this.visionService.processVideo(event);
          }
          break;
        }
        default:
          this.logger.warn(
            `Unknown eventType "${envelope.eventType}" for ${msgId} — deleting`,
          );
      }

      await this.deleteMessage(message);
      this.logger.log(`Message deleted — ${msgId}`);
    } catch (err) {
      this.logger.error(`Failed to process message ${msgId}`, err);
      // Leave message in queue — visibility timeout will return it for retry.
    }
  }

  /**
   * Triggers the embedding pipeline for a given analytics event: fetches the
   * content text and stores its embedding. Idempotent — re-delivery is safe
   * because the upsert is keyed on (content_id, model).
   */
  private async triggerEmbeddingPipeline(
    event: AnalyticsUpdatedEvent,
  ): Promise<void> {
    await this.embeddingsService.embedContent(event.contentId);
  }

  /**
   * Unwraps the outer two envelope layers that SNS adds when delivering to SQS.
   *
   * Layer 1 — SQS message body is an SNS notification envelope:
   *   { Type: "Notification", Message: "<json string>", ... }
   *
   * Layer 2 — SNS envelope.Message is an event wrapper:
   *   { eventType: "...", payload: "<json string>", occurredAt: "..." }
   *
   * The wrapper is shared by all publishers (analytics-service and
   * media-service). Layer 3 (payload) is parsed per event type.
   */
  private unwrapEnvelope(message: Message): AnalyticsEventMessage | null {
    const msgId = message.MessageId ?? 'unknown';
    try {
      const sqsBody = JSON.parse(message.Body ?? '{}') as SnsEnvelope;
      const rawMessage: string =
        sqsBody.Type === 'Notification' && sqsBody.Message
          ? sqsBody.Message
          : (message.Body ?? '{}');

      const eventMessage = JSON.parse(rawMessage) as AnalyticsEventMessage;
      if (!eventMessage.eventType || !eventMessage.payload) {
        this.logger.warn(
          `Skipping malformed message ${msgId} — missing eventType/payload field`,
        );
        return null;
      }
      return eventMessage;
    } catch {
      this.logger.warn(`Failed to parse message body for ${msgId}`);
      return null;
    }
  }

  private parseAnalyticsEvent(
    envelope: AnalyticsEventMessage,
    msgId: string,
  ): AnalyticsUpdatedEvent | null {
    try {
      const event = JSON.parse(envelope.payload) as AnalyticsUpdatedEvent;
      if (!event.ownerId || !event.contentId || !event.platform) {
        this.logger.warn(
          `Skipping malformed message ${msgId} — missing required fields (ownerId/contentId/platform)`,
        );
        return null;
      }
      return event;
    } catch {
      this.logger.warn(`Failed to parse analytics payload for ${msgId}`);
      return null;
    }
  }

  private parseVideoUploadedEvent(
    envelope: AnalyticsEventMessage,
    msgId: string,
  ): VideoUploadedEvent | null {
    try {
      const event = JSON.parse(envelope.payload) as VideoUploadedEvent;
      if (!event.ownerId || !event.mediaId || !event.s3Key) {
        this.logger.warn(
          `Skipping malformed message ${msgId} — missing required fields (ownerId/mediaId/s3Key)`,
        );
        return null;
      }
      return event;
    } catch {
      this.logger.warn(`Failed to parse video-uploaded payload for ${msgId}`);
      return null;
    }
  }

  private async deleteMessage(message: Message): Promise<void> {
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
