package com.creatorflow.media_service.services;

import com.creatorflow.media_service.configuration.AwsProperties;
import com.creatorflow.media_service.dto.CreatorflowEventMessage;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;
import software.amazon.awssdk.services.sns.model.PublishResponse;

@Service
public class SnsPublisher {

    private static final Logger log = LoggerFactory.getLogger(SnsPublisher.class);

    private final SnsClient snsClient;
    private final AwsProperties awsProperties;
    private final ObjectMapper objectMapper;

    public SnsPublisher(SnsClient snsClient, AwsProperties awsProperties) {
        this.snsClient = snsClient;
        this.awsProperties = awsProperties;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    /**
     * Publish an event to any topic by ARN key from {@code app.aws.topics.*}.
     *
     * @param topicKey key in the topics map (e.g. "content-published")
     * @param event    the event to publish
     * @return SNS message ID
     */
    public String publishToTopic(String topicKey, CreatorflowEventMessage event) {
        String topicArn = awsProperties.getTopics().get(topicKey);
        if (topicArn == null || topicArn.isBlank()) {
            throw new IllegalStateException("SNS topic ARN not configured for key: " + topicKey);
        }

        String messageBody;
        try {
            messageBody = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialise event to JSON", e);
        }

        PublishRequest request = PublishRequest.builder()
                .topicArn(topicArn)
                .message(messageBody)
                .subject(event.eventType())
                .build();

        PublishResponse response = snsClient.publish(request);
        log.info("SNS publish OK — topic: {}, messageId: {}, eventType: {}",
                topicArn, response.messageId(), event.eventType());
        return response.messageId();
    }
}
