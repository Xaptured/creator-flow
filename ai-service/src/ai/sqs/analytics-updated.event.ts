/**
 * Shape of the `analytics.updated` event body published to ai-processing-queue.
 *
 * analytics-service serialises this as JSON when it enqueues a message after
 * persisting a new analytics snapshot.
 */
export interface AnalyticsUpdatedEvent {
  ownerId: string;
  contentId: string;
  snapshotId: string;
}
