package com.creatorflow.media_service.services.dispatcher;

import com.creatorflow.media_service.dto.ContentPublishedPayload;
import com.creatorflow.media_service.dto.ContentReadyToPublishPayload;
import com.creatorflow.media_service.dto.CreatorflowEventMessage;
import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.ContentStatus;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.exception.OAuthTokenExchangeException;
import com.creatorflow.media_service.repository.ContentRepository;
import com.creatorflow.media_service.repository.IgContainerTrackingRepository;
import com.creatorflow.media_service.services.PlatformAdapter;
import com.creatorflow.media_service.services.PlatformAdapterRegistry;
import com.creatorflow.media_service.services.SnsPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles transactional processing of a single SQS message from
 * {@code post-dispatcher-queue}.
 *
 * <p>
 * Separated from {@link PublishDispatcherListener} so {@code @Transactional}
 * is applied via a Spring proxy — self-calls from a {@code @Scheduled} method
 * bypass it.
 * </p>
 *
 * <p>
 * For each {@code CONTENT_READY_TO_PUBLISH} message:
 * </p>
 * <ol>
 * <li>Deserialise payload to get contentId, ownerId, platformTargets.</li>
 * <li>Look up the content row (owned by ownerId) — skip stale messages.</li>
 * <li>Resolve the single platform from platformTargets.</li>
 * <li>Call {@link PlatformAdapter#publish(UUID, Content)} for that platform.</li>
 * <li>On success: write {@code PUBLISHED} + platformPostId directly to DB, then emit
 *     {@code CONTENT_PUBLISHED} to SNS (analytics fan-out), then delete the SQS message.</li>
 * <li>On non-retryable failure (invalid_grant, empty targets): write {@code FAILED} to DB,
 *     emit {@code CONTENT_FAILED} to SNS, delete the SQS message.</li>
 * <li>On retryable failure (transient errors): do NOT write to DB, do NOT emit SNS,
 *     do NOT delete — SQS visibility timeout drives retry up to maxReceiveCount, then DLQ.</li>
 * </ol>
 *
 * <p>
 * media-service is the single writer for {@code content.status} after publish.
 * scheduler-service's ContentStatusListener/ContentStatusProcessor have been removed (CF-103).
 * The SNS {@code CONTENT_PUBLISHED} event is retained solely for analytics-service fan-out.
 * </p>
 *
 * <p>
 * Instagram is handled differently: {@link PlatformAdapter#publish} records an
 * {@code IgContainerTracking} row and returns {@code null}. The
 * {@code IgContainerPollingJob} polls until the container is ready, then writes
 * status to DB and emits SNS itself.
 * </p>
 */
@Slf4j
@Service
public class PublishDispatcherProcessor {

    private static final String EVENT_PUBLISHED = "CONTENT_PUBLISHED";
    private static final String EVENT_FAILED = "CONTENT_FAILED";

    private final SqsClient sqsClient;
    private final ContentRepository contentRepository;
    private final IgContainerTrackingRepository igContainerTrackingRepository;
    private final PlatformAdapterRegistry adapterRegistry;
    private final SnsPublisher snsPublisher;
    private final ObjectMapper objectMapper;

    public PublishDispatcherProcessor(SqsClient sqsClient,
            ContentRepository contentRepository,
            IgContainerTrackingRepository igContainerTrackingRepository,
            PlatformAdapterRegistry adapterRegistry,
            SnsPublisher snsPublisher) {
        this.sqsClient = sqsClient;
        this.contentRepository = contentRepository;
        this.igContainerTrackingRepository = igContainerTrackingRepository;
        this.adapterRegistry = adapterRegistry;
        this.snsPublisher = snsPublisher;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @Transactional(noRollbackFor = Exception.class)
    public void process(String queueUrl, Message sqsMessage) {
        ContentReadyToPublishPayload payload;
        try {
            payload = deserialisePayload(sqsMessage.body());
        } catch (JsonProcessingException e) {
            log.error("publish-dispatcher: failed to deserialise message — messageId: {}, body: {}",
                    sqsMessage.messageId(), sqsMessage.body(), e);
            // Malformed message — delete to avoid infinite DLQ loop on unrecoverable parse
            // error.
            deleteMessage(queueUrl, sqsMessage.receiptHandle());
            return;
        }

        UUID contentId = payload.getContentId();
        UUID ownerId = payload.getOwnerId();

        Optional<Content> contentOpt = contentRepository.findByIdAndOwnerId(contentId, ownerId);
        if (contentOpt.isEmpty()) {
            log.warn("publish-dispatcher: content not found — contentId: {}, ownerId: {} — deleting stale message",
                    contentId, ownerId);
            deleteMessage(queueUrl, sqsMessage.receiptHandle());
            return;
        }

        Content content = contentOpt.get();

        if (content.getStatus() != ContentStatus.PUBLISHING) {
            log.warn("publish-dispatcher: content {} is in status {} (expected PUBLISHING) — skipping",
                    contentId, content.getStatus());
            deleteMessage(queueUrl, sqsMessage.receiptHandle());
            return;
        }

        List<PlatformType> targets = deserialisePlatformTargets(payload.getPlatformTargets());
        if (targets.isEmpty()) {
            log.error("publish-dispatcher: empty platformTargets for contentId: {} — treating as failure", contentId);
            updateContentStatus(content, ContentStatus.FAILED, null);
            emitStatusEvent(EVENT_FAILED, contentId, ownerId, null, null);
            deleteMessage(queueUrl, sqsMessage.receiptHandle());
            return;
        }

        // Each content row always has exactly one platform target.
        PlatformType platform = targets.get(0);

        try {
            PlatformAdapter adapter = adapterRegistry.getAdapter(platform);
            String platformPostId = adapter.publish(ownerId, content);

            if (igContainerTrackingRepository.findByContentId(contentId).isPresent()) {
                log.info(
                        "publish-dispatcher: Instagram container recorded (async) — contentId: {} — polling job will complete publish",
                        contentId);
                deleteMessage(queueUrl, sqsMessage.receiptHandle());
                return;
            }

            // Success: media-service writes status directly — no round-trip via SNS (CF-103).
            // SNS event is still emitted for analytics-service fan-out only.
            updateContentStatus(content, ContentStatus.PUBLISHED, platformPostId);
            log.info("publish-dispatcher: published to {} — contentId: {}", platform, contentId);
            emitStatusEvent(EVENT_PUBLISHED, contentId, ownerId, platform, platformPostId);
            deleteMessage(queueUrl, sqsMessage.receiptHandle());
        } catch (OAuthTokenExchangeException e) {
            if (e.isInvalidGrant()) {
                // Non-retryable: token permanently revoked — write FAILED, emit SNS, delete.
                log.error(
                        "publish-dispatcher: OAuth token revoked (invalid_grant) — platform: {}, contentId: {}, ownerId: {} — marking FAILED, deleting message",
                        platform, contentId, ownerId, e);
                updateContentStatus(content, ContentStatus.FAILED, null);
                emitStatusEvent(EVENT_FAILED, contentId, ownerId, platform, null);
                deleteMessage(queueUrl, sqsMessage.receiptHandle());
            } else {
                // Transient OAuth error — do not write DB, do not emit SNS, do not delete.
                // SQS visibility timeout drives retry up to maxReceiveCount, then DLQ.
                log.error("publish-dispatcher: transient OAuth error — platform: {}, contentId: {} — will retry",
                        platform, contentId, e);
            }
        } catch (Exception e) {
            // Transient failure — do not write DB, do not emit SNS, do not delete.
            // SQS visibility timeout drives retry up to maxReceiveCount, then DLQ.
            log.error("publish-dispatcher: platform publish failed — platform: {}, contentId: {} — will retry",
                    platform, contentId, e);
        }
    }

    private void updateContentStatus(Content content, ContentStatus newStatus, String platformPostId) {
        content.setStatus(newStatus);
        if (platformPostId != null) {
            content.setPlatformPostId(platformPostId);
        }
        contentRepository.save(content);
        log.debug("publish-dispatcher: content {} status → {}, platformPostId={}", content.getId(), newStatus, platformPostId);
    }

    private void emitStatusEvent(String eventType, UUID contentId, UUID ownerId,
                                  PlatformType platform, String platformPostId) {
        try {
            ContentPublishedPayload statusPayload = new ContentPublishedPayload(
                    contentId,
                    ownerId,
                    platform != null ? platform.name() : null,
                    platformPostId,
                    eventType.equals(EVENT_PUBLISHED) ? "PUBLISHED" : "FAILED");
            String payloadJson = objectMapper.writeValueAsString(statusPayload);
            CreatorflowEventMessage event = CreatorflowEventMessage.of(eventType, payloadJson);
            snsPublisher.publishToTopic("content-published", event);
        } catch (Exception e) {
            log.error("publish-dispatcher: failed to emit {} for contentId: {}", eventType, contentId, e);
        }
    }

    private ContentReadyToPublishPayload deserialisePayload(String body) throws JsonProcessingException {
        String eventJson = unwrapSnsEnvelopeIfPresent(body);
        CreatorflowEventMessage event = objectMapper.readValue(eventJson, CreatorflowEventMessage.class);
        return objectMapper.readValue(event.payload(), ContentReadyToPublishPayload.class);
    }

    private List<PlatformType> deserialisePlatformTargets(String platformTargetsJson) {
        try {
            return objectMapper.readValue(platformTargetsJson, new TypeReference<List<PlatformType>>() {
            });
        } catch (JsonProcessingException e) {
            log.error("publish-dispatcher: failed to deserialise platformTargets: {}", platformTargetsJson, e);
            return List.of();
        }
    }

    private String unwrapSnsEnvelopeIfPresent(String body) throws JsonProcessingException {
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
        log.debug("publish-dispatcher: deleted — receiptHandle prefix: {}",
                receiptHandle.substring(0, Math.min(20, receiptHandle.length())));
    }
}
