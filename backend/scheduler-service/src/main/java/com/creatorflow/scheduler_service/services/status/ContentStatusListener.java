package com.creatorflow.scheduler_service.services.status;

import com.creatorflow.scheduler_service.configuration.AwsProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;

import java.util.List;

/**
 * Polls {@code content-status-queue} on a fixed schedule and delegates each
 * message to {@link ContentStatusProcessor} for transactional processing.
 *
 * <p>This queue is subscribed to the {@code content-published} SNS topic which
 * media-service publishes {@code CONTENT_PUBLISHED} and {@code CONTENT_FAILED}
 * events to. On receipt, {@link ContentStatusProcessor} updates the content row
 * status to PUBLISHED or FAILED.</p>
 *
 * <p>Polling and processing are separated so that {@code @Transactional} on
 * {@link ContentStatusProcessor#process} is honoured by the Spring proxy.</p>
 */
@Service
public class ContentStatusListener {

    private static final Logger log = LoggerFactory.getLogger(ContentStatusListener.class);
    private static final int MAX_MESSAGES = 10;
    private static final int WAIT_SECONDS = 5;

    private final SqsClient sqsClient;
    private final AwsProperties awsProperties;
    private final ContentStatusProcessor processor;

    public ContentStatusListener(SqsClient sqsClient,
                                  AwsProperties awsProperties,
                                  ContentStatusProcessor processor) {
        this.sqsClient = sqsClient;
        this.awsProperties = awsProperties;
        this.processor = processor;
    }

    @Scheduled(fixedDelayString = "${app.sqs.poll-delay-ms}")
    public void pollContentStatusQueue() {
        String queueUrl = awsProperties.getQueues().get("content-status");
        if (queueUrl == null || queueUrl.isBlank()) {
            log.warn("SQS queue URL not configured: app.aws.queues.content-status — skipping poll");
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
            log.debug("content-status-queue: no messages");
            return;
        }

        log.info("content-status-queue: received {} message(s)", messages.size());

        for (Message message : messages) {
            processor.process(queueUrl, message);
        }
    }
}
