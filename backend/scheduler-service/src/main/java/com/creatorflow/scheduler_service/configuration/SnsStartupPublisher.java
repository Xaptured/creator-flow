package com.creatorflow.scheduler_service.configuration;

import com.creatorflow.scheduler_service.dto.CreatorflowEventMessage;
import com.creatorflow.scheduler_service.services.SnsPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Publishes a test event to {@code creatorflow-events} SNS topic on startup.
 *
 * <p>Verifies end-to-end wiring: SnsClient → LocalStack/AWS SNS → fan-out
 * to all subscribed queues (content-scheduler, post-dispatcher, analytics).
 * The {@link com.creatorflow.scheduler_service.services.SqsMessageListener}
 * will then pick up the message from content-scheduler-queue.</p>
 */
@Component
public class SnsStartupPublisher implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SnsStartupPublisher.class);

    private final SnsPublisher snsPublisher;

    public SnsStartupPublisher(SnsPublisher snsPublisher) {
        this.snsPublisher = snsPublisher;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            CreatorflowEventMessage testEvent = CreatorflowEventMessage.of(
                    "SERVICE_STARTED",
                    "{\"service\":\"scheduler-service\",\"message\":\"SNS+SQS wiring verified\"}"
            );
            String messageId = snsPublisher.publishToCreatorflowEvents(testEvent);
            log.info("Startup SNS test publish OK — messageId: {}", messageId);
        } catch (Exception e) {
            // Non-fatal: log warning and continue. Wiring issue surfaced without killing startup.
            log.warn("Startup SNS test publish FAILED — check AWS/LocalStack config: {}", e.getMessage());
        }
    }
}
