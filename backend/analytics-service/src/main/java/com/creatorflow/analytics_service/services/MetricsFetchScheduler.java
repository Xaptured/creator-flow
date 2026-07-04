package com.creatorflow.analytics_service.services;

import com.creatorflow.analytics_service.configuration.PlatformScheduleConfig;
import com.creatorflow.analytics_service.configuration.PlatformScheduleConfig.WindowSpec;
import com.creatorflow.analytics_service.jobs.MetricsFetchJob;
import com.creatorflow.analytics_service.model.PlatformType;
import org.quartz.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Schedules per-platform metric fetch jobs anchored to the content's live time.
 *
 * <p>Window counts and offsets are defined in {@link PlatformScheduleConfig}:
 * <ul>
 *   <li>Twitter / Instagram — T+1h, T+24h, T+7d  (near-realtime APIs)</li>
 *   <li>YouTube             — T+72h, T+7d, T+30d  (API data finalises ~48–72h after publish)</li>
 * </ul>
 *
 * <p>All jobs are anchored to {@code liveAt} — the instant the content became
 * publicly visible on the platform — not to the time this method is called.
 * For YouTube, {@code liveAt} is the timestamp the creator entered in the
 * CreatorFlow compose UI ("when did your video go live on YouTube?").</p>
 */
@Service
public class MetricsFetchScheduler {

    private static final Logger log = LoggerFactory.getLogger(MetricsFetchScheduler.class);

    private final Scheduler quartzScheduler;

    /**
     * TEST-ONLY accelerated mode. When {@code app.metrics.accelerated=true} the
     * real hour offsets are ignored and each window fires after a fixed number
     * of MINUTES taken from {@code app.metrics.accelerated-offset-minutes}
     * (default "5,10,15"): window 0 at 5 min, window 1 at 10 min, window 2 at
     * 15 min. Lets you exercise publish -> analytics -> embedding end to end
     * with a comfortable gap between fetches, without waiting the real 72 h.
     * Defaults to off (production keeps the real hour schedule).
     */
    private final boolean accelerated;
    private final int[] acceleratedOffsetMinutes;

    public MetricsFetchScheduler(
            Scheduler quartzScheduler,
            @Value("${app.metrics.accelerated:false}") boolean accelerated,
            @Value("${app.metrics.accelerated-offset-minutes:5,10,15}") String offsetMinutesCsv) {
        this.quartzScheduler = quartzScheduler;
        this.accelerated = accelerated;
        this.acceleratedOffsetMinutes = parseOffsets(offsetMinutesCsv);
        if (accelerated) {
            log.warn("MetricsFetchScheduler ACCELERATED mode ON — windows fire at {} minutes (TEST ONLY)",
                    Arrays.toString(acceleratedOffsetMinutes));
        }
    }

    private static int[] parseOffsets(String csv) {
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(v -> !v.isEmpty())
                .mapToInt(Integer::parseInt)
                .toArray();
    }

    /**
     * Schedule metric fetch jobs for the given content on the given platform.
     * The number of jobs and their offsets are determined by {@link PlatformScheduleConfig}.
     *
     * @param contentId      UUID of the published content
     * @param ownerId        UUID of the content owner
     * @param platform       platform the content was published to
     * @param platformPostId platform-native post ID (YouTube videoId, tweet ID, IG media ID); may be null
     * @param liveAt         the instant the content became publicly visible — T=0 for all windows
     */
    public void scheduleMetricFetches(
            UUID contentId, UUID ownerId, PlatformType platform, String platformPostId, Instant liveAt, String title) {

        PlatformScheduleConfig config = PlatformScheduleConfig.forPlatform(platform);

        List<WindowSpec> windows = config.getWindows();
        for (int i = 0; i < windows.size(); i++) {
            scheduleJob(contentId, ownerId, platform, platformPostId, windows.get(i), i, liveAt, title);
        }

        log.info("Scheduled {} metric fetch jobs — contentId: {}, platform: {}, platformPostId: {}, liveAt: {}",
                config.getWindows().size(), contentId, platform, platformPostId, liveAt);
    }

    private void scheduleJob(
            UUID contentId, UUID ownerId, PlatformType platform, String platformPostId,
            WindowSpec window, int windowIndex, Instant liveAt, String title) {

        String jobKey = String.format("metrics-%s-%s-%dh", contentId, platform.name().toLowerCase(), window.hours());

        JobDataMap dataMap = new JobDataMap();
        dataMap.put(MetricsFetchJob.KEY_CONTENT_ID,    contentId.toString());
        dataMap.put(MetricsFetchJob.KEY_OWNER_ID,      ownerId.toString());
        dataMap.put(MetricsFetchJob.KEY_PLATFORM,      platform.name());
        dataMap.put(MetricsFetchJob.KEY_WINDOW_HOURS,  window.hours());
        dataMap.put(MetricsFetchJob.KEY_WINDOW_LABEL,  window.label());
        if (platformPostId != null) {
            dataMap.put(MetricsFetchJob.KEY_PLATFORM_POST_ID, platformPostId);
        }
        if (title != null) {
            dataMap.put(MetricsFetchJob.KEY_TITLE, title);
        }

        JobDetail jobDetail = JobBuilder.newJob(MetricsFetchJob.class)
                .withIdentity(jobKey, "analytics")
                .withDescription(String.format(
                        "Fetch %s metrics for content %s at T+%dh (%s)",
                        platform, contentId, window.hours(), window.label()))
                .usingJobData(dataMap)
                .storeDurably(false)
                .build();

        // Fire at liveAt + windowHours — anchored to when the content went live, not now.
        // Accelerated test mode treats the window value as seconds instead of hours.
        final long offsetSeconds;
        if (accelerated) {
            int idx = Math.min(windowIndex, acceleratedOffsetMinutes.length - 1);
            offsetSeconds = (long) acceleratedOffsetMinutes[idx] * 60L;
        } else {
            offsetSeconds = (long) window.hours() * 3600L;
        }
        Date fireAt = Date.from(liveAt.plusSeconds(offsetSeconds));

        Trigger trigger = TriggerBuilder.newTrigger()
                .forJob(jobDetail)
                .withIdentity(jobKey + "-trigger", "analytics")
                .startAt(fireAt)
                .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                        .withMisfireHandlingInstructionFireNow())
                .build();

        try {
            quartzScheduler.scheduleJob(jobDetail, trigger);
            log.info("Quartz job scheduled — key: {}, fireAt: {} (T+{}h / {})",
                    jobKey, fireAt, window.hours(), window.label());
        } catch (SchedulerException e) {
            log.error("Failed to schedule Quartz job — key: {}", jobKey, e);
        }
    }
}
