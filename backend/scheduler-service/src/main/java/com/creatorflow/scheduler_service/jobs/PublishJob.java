package com.creatorflow.scheduler_service.jobs;

import com.creatorflow.scheduler_service.dto.ContentReadyToPublishPayload;
import com.creatorflow.scheduler_service.dto.CreatorflowEventMessage;
import com.creatorflow.scheduler_service.model.Content;
import com.creatorflow.scheduler_service.model.ContentStatus;
import com.creatorflow.scheduler_service.repository.ContentRepository;
import com.creatorflow.scheduler_service.services.SnsPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Quartz job that fires on a fixed schedule (configured in {@link com.creatorflow.scheduler_service.configuration.QuartzConfiguration}).
 *
 * <p>Each execution:
 * <ol>
 *   <li>Fetches all SCHEDULED content rows whose {@code scheduled_at <= now}</li>
 *   <li>Transitions each to PUBLISHING (prevents double-fire on overlapping polls)</li>
 *   <li>Publishes a {@code CONTENT_READY_TO_PUBLISH} event to the {@code creatorflow-events} SNS topic</li>
 * </ol>
 * The SNS fan-out delivers the event to {@code post-dispatcher-queue}, consumed by
 * media-service's PublishDispatcherListener. After publish, media-service writes
 * {@code content.status} directly to DB and emits {@code CONTENT_PUBLISHED} to the
 * {@code content-published} topic, which analytics-service consumes via
 * {@code analytics-queue} to schedule metric fetch jobs (CF-103).
 *</p>
 */
@Component
public class PublishJob implements Job {

    private static final Logger log = LoggerFactory.getLogger(PublishJob.class);
    private static final String EVENT_TYPE = "CONTENT_READY_TO_PUBLISH";

    private final ContentRepository contentRepository;
    private final SnsPublisher snsPublisher;
    private final ObjectMapper objectMapper;

    public PublishJob(ContentRepository contentRepository, SnsPublisher snsPublisher) {
        this.contentRepository = contentRepository;
        this.snsPublisher = snsPublisher;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @Override
    @Transactional
    public void execute(JobExecutionContext context) throws JobExecutionException {
        Instant now = Instant.now();
        List<Content> dueContent = contentRepository.findDueContent(ContentStatus.SCHEDULED, now);

        if (dueContent.isEmpty()) {
            log.debug("PublishJob: no due content at {}", now);
            return;
        }

        log.info("PublishJob: found {} due content row(s) at {}", dueContent.size(), now);

        for (Content content : dueContent) {
            processContent(content);
        }
    }

    private void processContent(Content content) {
        content.setStatus(ContentStatus.PUBLISHING);
        contentRepository.save(content);

        try {
            String payloadJson = serialisePayload(content);
            CreatorflowEventMessage event = CreatorflowEventMessage.of(EVENT_TYPE, payloadJson);
            String messageId = snsPublisher.publishToCreatorflowEvents(event);
            log.info("PublishJob: fired {} — contentId: {}, snsMessageId: {}",
                    EVENT_TYPE, content.getId(), messageId);
        } catch (Exception e) {
            log.error("PublishJob: SNS publish failed for contentId: {} — reverting to SCHEDULED",
                    content.getId(), e);
            content.setStatus(ContentStatus.SCHEDULED);
            contentRepository.save(content);
        }
    }

    private String serialisePayload(Content content) {
        ContentReadyToPublishPayload payload = new ContentReadyToPublishPayload(
                content.getId(),
                content.getOwnerId(),
                content.getPlatformTargets()
        );
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialise ContentReadyToPublishPayload", e);
        }
    }
}
