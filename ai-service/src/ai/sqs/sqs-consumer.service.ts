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

  constructor(private readonly config: ConfigService) {
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
    try {
      const event = this.parseEvent(message);
      if (!event) return;

      this.logger.log(
        `analytics.updated received — ownerId=${event.ownerId} contentId=${event.contentId} platform=${event.platform}`,
      );

      // Trigger embedding pipeline stub.
      // Full implementation wired in a later ticket (CF-93+).
      await this.triggerEmbeddingPipeline(event);

      await this.deleteMessage(message);
      this.logger.log(`Message deleted — ${message.MessageId ?? 'unknown'}`);
    } catch (err) {
      this.logger.error(
        `Failed to process message ${message.MessageId ?? 'unknown'}`,
        err,
      );
      // Leave message in queue — visibility timeout will return it for retry.
    }
  }

  /**
   * Stub: triggers the embedding pipeline for a given analytics event.
   *
   * Replace with a real call to EmbeddingsService once the pipeline is wired.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async triggerEmbeddingPipeline(
    event: AnalyticsUpdatedEvent,
  ): Promise<void> {
    this.logger.log(
      `Embedding pipeline stub triggered for contentId=${event.contentId}`,
    );
  }

  /**
   * Unwraps the two-layer envelope that SNS adds when delivering to SQS.
   *
   * Layer 1 — SQS message body is an SNS notification envelope:
   *   { Type: "Notification", Message: "<json string>", ... }
   *
   * Layer 2 — SNS envelope.Message is an AnalyticsEventMessage:
   *   { eventType: "analytics.updated", payload: "<json string>", occurredAt: "..." }
   *
   * Layer 3 — AnalyticsEventMessage.payload is the actual AnalyticsUpdatedPayload:
   *   { ownerId, contentId, platform, metrics }
   */
  private parseEvent(message: Message): AnalyticsUpdatedEvent | null {
    const msgId = message.MessageId ?? 'unknown';
    try {
      // Layer 1: unwrap SNS envelope
      const sqsBody = JSON.parse(message.Body ?? '{}') as SnsEnvelope;
      const rawMessage: string =
        sqsBody.Type === 'Notification' && sqsBody.Message
          ? sqsBody.Message
          : (message.Body ?? '{}');

      // Layer 2: unwrap AnalyticsEventMessage
      const eventMessage = JSON.parse(rawMessage) as AnalyticsEventMessage;
      if (!eventMessage.payload) {
        this.logger.warn(
          `Skipping malformed message ${msgId} — missing payload field`,
        );
        return null;
      }

      // Layer 3: parse actual payload
      const event = JSON.parse(eventMessage.payload) as AnalyticsUpdatedEvent;
      if (!event.ownerId || !event.contentId || !event.platform) {
        this.logger.warn(
          `Skipping malformed message ${msgId} — missing required fields (ownerId/contentId/platform)`,
        );
        return null;
      }
      return event;
    } catch {
      this.logger.warn(`Failed to parse message body for ${msgId}`);
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
