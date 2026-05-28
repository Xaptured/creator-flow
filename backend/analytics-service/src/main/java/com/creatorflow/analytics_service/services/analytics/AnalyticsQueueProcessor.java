package com.creatorflow.analytics_service.services.analytics;

import com.creatorflow.analytics_service.dto.ContentPublishedPayload;
import com.creatorflow.analytics_service.model.PlatformType;
import com.creatorflow.analytics_service.services.MetricsFetchScheduler;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;

import java.time.Instant;

/**
 * Handles transactional processing of a single SQS message from
 * {@code analytics-queue}.
 *
 * <p>Separated from {@link AnalyticsQueueListener} so {@code @Transactional}
 * is applied via a Spring proxy — self-calls from a {@code @Scheduled} method
 * would bypass it.</p>
 *
 * <p>For each {@code CONTENT_PUBLISHED} message:</p>
 * <ol>
 *   <li>Deserialise the SNS envelope and inner event payload.</li>
 *   <li>Validate contentId, ownerId, and platform fields.</li>
 *   <li>Schedule 3 Quartz metric fetch jobs (T+1hr, T+24hr, T+7d) via {@link MetricsFetchScheduler}.</li>
 *   <li>Delete the SQS message on success; leave it on parse failure for retry / DLQ.</li>
 * </ol>
 */
@Slf4j
@Service
public class AnalyticsQueueProcessor {

    private static final String EVENT_TYPE_CONTENT_PUBLISHED = "CONTENT_PUBLISHED";

    private final SqsClient sqsClient;
    private final MetricsFetchScheduler metricsFetchScheduler;
    private final ObjectMapper objectMapper;

    public AnalyticsQueueProcessor(SqsClient sqsClient,
                                    MetricsFetchScheduler metricsFetchScheduler) {
        this.sqsClient = sqsClient;
        this.metricsFetchScheduler = metricsFetchScheduler;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @Transactional
    public void process(String queueUrl, Message sqsMessage) {
        try {
            String body = unwrapSnsEnvelope(sqsMessage.body());
            JsonNode root = objectMapper.readTree(body);

            String eventType = root.path("eventType").asText();
            if (!EVENT_TYPE_CONTENT_PUBLISHED.equals(eventType)) {
                log.debug("analytics-queue: ignoring event type: {} — messageId: {}", eventType, sqsMessage.messageId());
                deleteMessage(queueUrl, sqsMessage.receiptHandle());
                return;
            }

            String payloadStr = root.path("payload").asText();
            ContentPublishedPayload payload = objectMapper.readValue(payloadStr, ContentPublishedPayload.class);

            if (payload.getContentId() == null || payload.getOwnerId() == null) {
                log.error("analytics-queue: CONTENT_PUBLISHED payload missing contentId or ownerId — messageId: {}",
                        sqsMessage.messageId());
                deleteMessage(queueUrl, sqsMessage.receiptHandle());
                return;
            }

            PlatformType platform = resolvePlatform(payload.getPlatform());
            if (platform == null) {
                log.warn("analytics-queue: unknown platform '{}' — messageId: {} — skipping",
                        payload.getPlatform(), sqsMessage.messageId());
                deleteMessage(queueUrl, sqsMessage.receiptHandle());
                return;
            }

            Instant liveAt = resolveLiveAt(payload, sqsMessage.messageId());

            metricsFetchScheduler.scheduleMetricFetches(
                    payload.getContentId(), payload.getOwnerId(), platform, payload.getPlatformPostId(), liveAt);
            log.info("analytics-queue: scheduled metric fetch jobs — contentId: {}, platform: {}, platformPostId: {}, liveAt: {}",
                    payload.getContentId(), platform, payload.getPlatformPostId(), liveAt);

            deleteMessage(queueUrl, sqsMessage.receiptHandle());

        } catch (JsonProcessingException e) {
            log.error("analytics-queue: failed to parse SQS message — messageId: {}, body: {}",
                    sqsMessage.messageId(), sqsMessage.body(), e);
            // Leave for visibility timeout retry / DLQ
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Resolves T=0 for window scheduling.
     *
     * <p>Uses {@code payload.getScheduledLiveAt()} when present — this is the
     * user-confirmed time the content went live on the platform.  Falls back to
     * {@code Instant.now()} for legacy events that pre-date this field, logging a
     * warning so we can monitor how often the fallback fires during the rollout.</p>
     */
    private Instant resolveLiveAt(ContentPublishedPayload payload, String messageId) {
        if (payload.getScheduledLiveAt() != null) {
            return payload.getScheduledLiveAt();
        }
        log.warn("analytics-queue: scheduledLiveAt missing in CONTENT_PUBLISHED payload — "
                + "falling back to Instant.now(). contentId: {}, platform: {}, messageId: {}. "
                + "Ensure the publisher sets scheduledLiveAt on all new events.",
                payload.getContentId(), payload.getPlatform(), messageId);
        return Instant.now();
    }

    /**
     * SNS wraps messages in a notification envelope when delivering to SQS:
     * {@code { "Type": "Notification", "Message": "<inner-json-string>", ... }}.
     * Unwrap to get the inner JSON; return body unchanged if not an SNS envelope.
     */
    private String unwrapSnsEnvelope(String body) throws JsonProcessingException {
        JsonNode root = objectMapper.readTree(body);
        JsonNode typeNode = root.get("Type");
        if (typeNode != null && "Notification".equals(typeNode.asText())) {
            return root.get("Message").asText();
        }
        return body;
    }

    private void deleteMessage(String queueUrl, String receiptHandle) {
        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                .queueUrl(queueUrl)
                .receiptHandle(receiptHandle)
                .build());
        log.debug("analytics-queue: deleted — receiptHandle prefix: {}",
                receiptHandle.substring(0, Math.min(20, receiptHandle.length())));
    }

    private PlatformType resolvePlatform(String platform) {
        if (platform == null) return null;
        try {
            return PlatformType.valueOf(platform.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
