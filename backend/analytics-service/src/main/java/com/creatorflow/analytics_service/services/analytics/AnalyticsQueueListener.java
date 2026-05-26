package com.creatorflow.analytics_service.services.analytics;

import com.creatorflow.analytics_service.configuration.AwsProperties;
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
 * Polls {@code analytics-queue} on a fixed schedule and delegates each message
 * to {@link AnalyticsQueueProcessor} for transactional processing.
 *
 * <p>This queue is subscribed to the {@code content-published} SNS topic.
 * On receipt of a {@code CONTENT_PUBLISHED} event, the processor schedules
 * Quartz metric fetch jobs at T+1hr, T+24hr, and T+7d.</p>
 *
 * <p>Polling and processing are separated so that {@code @Transactional} on
 * {@link AnalyticsQueueProcessor#process} is honoured by the Spring proxy —
 * self-calls from a {@code @Scheduled} method would bypass it.</p>
 */
@Service
public class AnalyticsQueueListener {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsQueueListener.class);
    private static final String QUEUE_KEY = "analytics";
    private static final int MAX_MESSAGES = 10;
    private static final int WAIT_SECONDS = 5;

    private final SqsClient sqsClient;
    private final AwsProperties awsProperties;
    private final AnalyticsQueueProcessor processor;

    public AnalyticsQueueListener(SqsClient sqsClient,
                                   AwsProperties awsProperties,
                                   AnalyticsQueueProcessor processor) {
        this.sqsClient = sqsClient;
        this.awsProperties = awsProperties;
        this.processor = processor;
    }

    @Scheduled(fixedDelayString = "${app.sqs.poll-delay-ms:10000}")
    public void pollAnalyticsQueue() {
        String queueUrl = awsProperties.getQueues().get(QUEUE_KEY);
        if (queueUrl == null || queueUrl.isBlank()) {
            log.warn("SQS queue URL not configured: app.aws.queues.analytics — skipping poll");
            return;
        }

        ReceiveMessageResponse response = sqsClient.receiveMessage(
                ReceiveMessageRequest.builder()
                        .queueUrl(queueUrl)
                        .maxNumberOfMessages(MAX_MESSAGES)
                        .waitTimeSeconds(WAIT_SECONDS)
                        .build());

        List<Message> messages = response.messages();
        if (messages.isEmpty()) {
            log.debug("analytics-queue: no messages");
            return;
        }

        log.info("analytics-queue: received {} message(s)", messages.size());
        for (Message message : messages) {
            processor.process(queueUrl, message);
        }
    }
}
