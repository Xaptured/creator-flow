package com.creatorflow.analytics_service.services;

import com.creatorflow.analytics_service.jobs.MetricsFetchJob;
import com.creatorflow.analytics_service.model.PlatformType;
import org.quartz.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Schedules 3 Quartz jobs per published content item:
 * T+1hr, T+24hr, T+7d (168hr).
 */
@Service
public class MetricsFetchScheduler {

    private static final Logger log = LoggerFactory.getLogger(MetricsFetchScheduler.class);

    /** Fetch windows in hours: 1hr, 24hr, 7d */
    private static final int[] WINDOW_HOURS = {1, 24, 168};

    private final Scheduler quartzScheduler;

    public MetricsFetchScheduler(Scheduler quartzScheduler) {
        this.quartzScheduler = quartzScheduler;
    }

    /**
     * Schedule metric fetch jobs for the given content on the given platform.
     * 3 jobs are created — one per window (1hr / 24hr / 7d from now).
     *
     * @param contentId UUID of the published content
     * @param ownerId   UUID of the content owner
     * @param platform  platform the content was published to
     */
    public void scheduleMetricFetches(UUID contentId, UUID ownerId, PlatformType platform) {
        Instant now = Instant.now();

        for (int windowHours : WINDOW_HOURS) {
            scheduleJob(contentId, ownerId, platform, windowHours, now);
        }

        log.info("Scheduled 3 metric fetch jobs — contentId: {}, platform: {}", contentId, platform);
    }

    private void scheduleJob(UUID contentId, UUID ownerId, PlatformType platform, int windowHours, Instant from) {
        String jobKey = String.format("metrics-%s-%s-%dh", contentId, platform.name().toLowerCase(), windowHours);

        JobDataMap dataMap = new JobDataMap();
        dataMap.put(MetricsFetchJob.KEY_CONTENT_ID, contentId.toString());
        dataMap.put(MetricsFetchJob.KEY_OWNER_ID, ownerId.toString());
        dataMap.put(MetricsFetchJob.KEY_PLATFORM, platform.name());
        dataMap.put(MetricsFetchJob.KEY_WINDOW_HOURS, windowHours);

        JobDetail jobDetail = JobBuilder.newJob(MetricsFetchJob.class)
                .withIdentity(jobKey, "analytics")
                .withDescription(String.format("Fetch %s metrics for content %s at T+%dhr", platform, contentId, windowHours))
                .usingJobData(dataMap)
                .storeDurably(false)
                .build();

        Date fireAt = Date.from(from.plusSeconds((long) windowHours * 3600));

        Trigger trigger = TriggerBuilder.newTrigger()
                .forJob(jobDetail)
                .withIdentity(jobKey + "-trigger", "analytics")
                .startAt(fireAt)
                .withSchedule(SimpleScheduleBuilder.simpleSchedule().withMisfireHandlingInstructionFireNow())
                .build();

        try {
            quartzScheduler.scheduleJob(jobDetail, trigger);
            log.info("Quartz job scheduled — key: {}, fireAt: {}", jobKey, fireAt);
        } catch (SchedulerException e) {
            log.error("Failed to schedule Quartz job — key: {}", jobKey, e);
        }
    }
}
