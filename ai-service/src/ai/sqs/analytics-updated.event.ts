/**
 * Shape of the `analytics.updated` event delivered to ai-processing-queue.
 *
 * Message path from analytics-service → SNS → SQS → here:
 *   SQS body          → SNS envelope   { Type, Message, Subject, ... }
 *   SNS envelope.Message → AnalyticsEventMessage JSON  { eventType, payload, occurredAt }
 *   AnalyticsEventMessage.payload → AnalyticsUpdatedPayload JSON (this interface)
 *
 * Matches analytics-service's AnalyticsUpdatedPayload DTO.
 */
export interface AnalyticsUpdatedEvent {
  ownerId: string;
  contentId: string;
  platform: string;
  metrics: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    impressions: number | null;
    engagementRate: number | null;
    windowHours: number;
  };
}

/** SNS notification envelope that wraps every SQS message body when the queue
 *  subscribes to an SNS topic. */
export interface SnsEnvelope {
  Type: string;
  Message: string;
  Subject?: string;
  TopicArn?: string;
  MessageId?: string;
}

/** Outer event wrapper published by analytics-service to SNS. */
export interface AnalyticsEventMessage {
  eventType: string;
  payload: string;
  occurredAt: string;
}
