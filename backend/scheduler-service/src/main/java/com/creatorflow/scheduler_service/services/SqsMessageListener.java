package com.creatorflow.scheduler_service.services;

import com.creatorflow.scheduler_service.configuration.AwsProperties;
import com.creatorflow.scheduler_service.dto.CreatorflowEventMessage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;

import java.util.List;

/**
 * Polls the {@code content-scheduler-queue} SQS queue, logs received events,
 * and deletes them after successful processing.
 *
 * <p>Demonstrates the fan-out consumer pattern: SNS publishes to the topic and
 * all subscribed queues (content-scheduler, post-dispatcher, analytics) each
 * receive their own copy of the message.</p>
 */
@Service
public class SqsMessageListener {

    private static final Logger log = LoggerFactory.getLogger(SqsMessageListener.class);
    private static final int MAX_MESSAGES = 10;
    private static final int WAIT_SECONDS = 5; // long-poll

    private final SqsClient sqsClient;
    private final AwsProperties awsProperties;
    private final ObjectMapper objectMapper;

    public SqsMessageListener(SqsClient sqsClient, AwsProperties awsProperties) {
        this.sqsClient = sqsClient;
        this.awsProperties = awsProperties;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    /**
     * Poll {@code content-scheduler-queue} every 10 seconds.
     * Receives up to 10 messages per poll, processes each, then deletes.
     */
    @Scheduled(fixedDelayString = "${app.sqs.poll-delay-ms:10000}")
    public void pollContentSchedulerQueue() {
        String queueUrl = awsProperties.getQueues().get("content-scheduler");
        if (queueUrl == null || queueUrl.isBlank()) {
            log.warn("SQS queue URL not configured: app.aws.queues.content-scheduler — skipping poll");
            return;
        }

        ReceiveMessageRequest receiveRequest = ReceiveMessageRequest.builder()
                .queueUrl(queueUrl)
                .maxNumberOfMessages(MAX_MESSAGES)
                .waitTimeSeconds(WAIT_SECONDS)
                .build();

        ReceiveMessageResponse response = sqsClient.receiveMessage(receiveRequest);
        List<Message> messages = response.messages();

        if (messages.isEmpty()) {
            log.debug("content-scheduler-queue: no messages");
            return;
        }

        log.info("content-scheduler-queue: received {} message(s)", messages.size());

        for (Message message : messages) {
            processMessage(queueUrl, message);
        }
    }

    private void processMessage(String queueUrl, Message message) {
        try {
            String eventJson = unwrapSnsEnvelopeIfPresent(message.body());

            CreatorflowEventMessage event = objectMapper.readValue(
                    eventJson, CreatorflowEventMessage.class);

            log.info("SQS message received — messageId: {}, eventType: {}, occurredAt: {}, payload: {}",
                    message.messageId(),
                    event.eventType(),
                    event.occurredAt(),
                    event.payload());

            deleteMessage(queueUrl, message.receiptHandle());

        } catch (JsonProcessingException e) {
            log.error("Failed to deserialise SQS message body — messageId: {}, body: {}",
                    message.messageId(), message.body(), e);
            // Do NOT delete — leave for DLQ / retry
        }
    }

    /**
     * When SNS delivers to SQS it wraps the payload in a notification envelope:
     * <pre>{ "Type": "Notification", "Message": "<actual-json-string>", ... }</pre>
     * Unwrap to get the inner JSON. If the body is NOT an SNS envelope (e.g. direct
     * SQS send in tests) return it unchanged.
     */
    private String unwrapSnsEnvelopeIfPresent(String body) throws JsonProcessingException {
        JsonNode root = objectMapper.readTree(body);
        JsonNode typeNode = root.get("Type");
        if (typeNode != null && "Notification".equals(typeNode.asText())) {
            // "Message" field contains the inner JSON as an escaped string
            return root.get("Message").asText();
        }
        return body;
    }

    private void deleteMessage(String queueUrl, String receiptHandle) {
        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                .queueUrl(queueUrl)
                .receiptHandle(receiptHandle)
                .build());
        log.debug("SQS message deleted — receiptHandle prefix: {}",
                receiptHandle.substring(0, Math.min(20, receiptHandle.length())));
    }
}
