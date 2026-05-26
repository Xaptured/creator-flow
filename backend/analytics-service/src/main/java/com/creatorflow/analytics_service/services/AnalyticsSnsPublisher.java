package com.creatorflow.analytics_service.services;

import com.creatorflow.analytics_service.configuration.AwsProperties;
import com.creatorflow.analytics_service.dto.AnalyticsEventMessage;
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
public class AnalyticsSnsPublisher {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsSnsPublisher.class);
    private static final String TOPIC_KEY = "analytics-events";

    private final SnsClient snsClient;
    private final AwsProperties awsProperties;
    private final ObjectMapper objectMapper;

    public AnalyticsSnsPublisher(SnsClient snsClient, AwsProperties awsProperties) {
        this.snsClient = snsClient;
        this.awsProperties = awsProperties;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    /**
     * Publish an {@code analytics.updated} event to the {@code analytics-events} SNS topic.
     *
     * @param event the event envelope to publish
     * @return SNS message ID
     */
    public String publishAnalyticsUpdated(AnalyticsEventMessage event) {
        String topicArn = awsProperties.getTopics().get(TOPIC_KEY);
        if (topicArn == null || topicArn.isBlank()) {
            throw new IllegalStateException("SNS topic ARN not configured: app.aws.topics." + TOPIC_KEY);
        }

        String messageBody;
        try {
            messageBody = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialise analytics event to JSON", e);
        }

        PublishRequest request = PublishRequest.builder()
                .topicArn(topicArn)
                .message(messageBody)
                .subject(event.eventType())
                .build();

        PublishResponse response = snsClient.publish(request);
        log.info("SNS publish OK — topic: analytics-events, messageId: {}, eventType: {}",
                response.messageId(), event.eventType());
        return response.messageId();
    }
}
