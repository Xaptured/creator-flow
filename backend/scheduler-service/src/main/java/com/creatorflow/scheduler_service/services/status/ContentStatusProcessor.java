package com.creatorflow.scheduler_service.services.status;

import com.creatorflow.scheduler_service.dto.ContentPublishedPayload;
import com.creatorflow.scheduler_service.dto.CreatorflowEventMessage;
import com.creatorflow.scheduler_service.model.Content;
import com.creatorflow.scheduler_service.model.ContentStatus;
import com.creatorflow.scheduler_service.repository.ContentRepository;
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

import java.util.Optional;

/**
 * Handles transactional processing of a single SQS message from
 * {@code content-status-queue}.
 *
 * <p>Separated from {@link ContentStatusListener} so {@code @Transactional}
 * is applied via a Spring proxy — self-calls from a {@code @Scheduled} method bypass it.</p>
 *
 * <p>Consumes {@code CONTENT_PUBLISHED} and {@code CONTENT_FAILED} events emitted by
 * media-service's PublishDispatcherProcessor. Transitions the content row from
 * PUBLISHING to its final status (PUBLISHED or FAILED) and saves.</p>
 *
 * <p>This replaces the status-update logic that was previously in PostDispatcherProcessor,
 * completing the fully event-driven flow with no HTTP calls between services.</p>
 */
@Slf4j
@Service
public class ContentStatusProcessor {

    private static final String EVENT_PUBLISHED = "CONTENT_PUBLISHED";
    private static final String EVENT_FAILED = "CONTENT_FAILED";

    private final SqsClient sqsClient;
    private final ContentRepository contentRepository;
    private final ObjectMapper objectMapper;

    public ContentStatusProcessor(SqsClient sqsClient, ContentRepository contentRepository) {
        this.sqsClient = sqsClient;
        this.contentRepository = contentRepository;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @Transactional
    public void process(String queueUrl, Message sqsMessage) {
        ContentPublishedPayload payload;
        String eventType;

        try {
            String eventJson = unwrapSnsEnvelopeIfPresent(sqsMessage.body());
            CreatorflowEventMessage event = objectMapper.readValue(eventJson, CreatorflowEventMessage.class);
            eventType = event.eventType();

            if (!EVENT_PUBLISHED.equals(eventType) && !EVENT_FAILED.equals(eventType)) {
                log.debug("content-status: ignoring unrecognised event type: {} — messageId: {}",
                        eventType, sqsMessage.messageId());
                deleteMessage(queueUrl, sqsMessage.receiptHandle());
                return;
            }

            payload = objectMapper.readValue(event.payload(), ContentPublishedPayload.class);
        } catch (JsonProcessingException e) {
            log.error("content-status: failed to deserialise message — messageId: {}, body: {}",
                    sqsMessage.messageId(), sqsMessage.body(), e);
            deleteMessage(queueUrl, sqsMessage.receiptHandle());
            return;
        }

        Optional<Content> contentOpt = contentRepository.findByIdAndOwnerId(
                payload.getContentId(), payload.getOwnerId());

        if (contentOpt.isEmpty()) {
            log.warn("content-status: content not found — contentId: {}, ownerId: {} — deleting stale message",
                    payload.getContentId(), payload.getOwnerId());
            deleteMessage(queueUrl, sqsMessage.receiptHandle());
            return;
        }

        Content content = contentOpt.get();

        ContentStatus newStatus = EVENT_PUBLISHED.equals(eventType)
                ? ContentStatus.PUBLISHED
                : ContentStatus.FAILED;

        content.setStatus(newStatus);
        contentRepository.save(content);

        log.info("content-status: updated contentId: {} → {}", content.getId(), newStatus);
        deleteMessage(queueUrl, sqsMessage.receiptHandle());
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
        log.debug("content-status: deleted — receiptHandle prefix: {}",
                receiptHandle.substring(0, Math.min(20, receiptHandle.length())));
    }
}
