package com.creatorflow.media_service.services.dispatcher;

import com.creatorflow.media_service.configuration.AwsProperties;
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
 * Polls {@code post-dispatcher-queue} on a fixed schedule and delegates each
 * message to {@link PublishDispatcherProcessor} for transactional processing.
 *
 * <p>Polling and processing are separated so that {@code @Transactional} on
 * {@link PublishDispatcherProcessor#process} is honoured by the Spring proxy
 * (self-calls from a {@code @Scheduled} method would bypass it).</p>
 *
 * <p>On platform publish failure the processor intentionally does NOT delete the
 * message. SQS visibility timeout + maxReceiveCount=3 handles retries; after that
 * it moves to {@code content-dispatcher-dlq} automatically.</p>
 */
@Service
public class PublishDispatcherListener {

    private static final Logger log = LoggerFactory.getLogger(PublishDispatcherListener.class);
    private static final int MAX_MESSAGES = 10;
    private static final int WAIT_SECONDS = 5;

    private final SqsClient sqsClient;
    private final AwsProperties awsProperties;
    private final PublishDispatcherProcessor processor;

    public PublishDispatcherListener(SqsClient sqsClient,
                                     AwsProperties awsProperties,
                                     PublishDispatcherProcessor processor) {
        this.sqsClient = sqsClient;
        this.awsProperties = awsProperties;
        this.processor = processor;
    }

    @Scheduled(fixedDelayString = "${app.sqs.poll-delay-ms}")
    public void pollPostDispatcherQueue() {
        String queueUrl = awsProperties.getQueues().get("post-dispatcher");
        if (queueUrl == null || queueUrl.isBlank()) {
            log.warn("SQS queue URL not configured: app.aws.queues.post-dispatcher — skipping poll");
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
            log.debug("post-dispatcher-queue: no messages");
            return;
        }

        log.info("post-dispatcher-queue: received {} message(s)", messages.size());

        for (Message message : messages) {
            processor.process(queueUrl, message);
        }
    }
}
