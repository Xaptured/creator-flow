package com.creatorflow.analytics_service.jobs;

import com.creatorflow.analytics_service.model.PlatformType;
import com.creatorflow.analytics_service.services.AnalyticsService;
import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Quartz job that fetches metrics from a single platform for a single content item
 * at a scheduled window (T+1hr, T+24hr, T+7d).
 *
 * <p>Job data keys: {@code contentId}, {@code ownerId}, {@code platform},
 * {@code platformPostId} (optional), {@code windowHours}.</p>
 */
@Component
public class MetricsFetchJob implements Job {

    private static final Logger log = LoggerFactory.getLogger(MetricsFetchJob.class);

    public static final String KEY_CONTENT_ID       = "contentId";
    public static final String KEY_OWNER_ID         = "ownerId";
    public static final String KEY_PLATFORM         = "platform";
    public static final String KEY_PLATFORM_POST_ID = "platformPostId";
    public static final String KEY_WINDOW_HOURS     = "windowHours";
    public static final String KEY_WINDOW_LABEL     = "windowLabel";

    @Autowired
    private AnalyticsService analyticsService;

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        JobDataMap data = context.getMergedJobDataMap();

        UUID contentId       = UUID.fromString(data.getString(KEY_CONTENT_ID));
        UUID ownerId         = UUID.fromString(data.getString(KEY_OWNER_ID));
        PlatformType platform = PlatformType.valueOf(data.getString(KEY_PLATFORM));
        String platformPostId = data.getString(KEY_PLATFORM_POST_ID);
        int windowHours       = data.getInt(KEY_WINDOW_HOURS);
        String windowLabel    = data.getString(KEY_WINDOW_LABEL);

        log.info("MetricsFetchJob executing — contentId: {}, platform: {}, platformPostId: {}, window: {}h ({})",
                contentId, platform, platformPostId, windowHours, windowLabel);

        try {
            analyticsService.fetchAndRecord(contentId, ownerId, platform, platformPostId, windowHours, windowLabel);
        } catch (Exception e) {
            log.error("MetricsFetchJob failed — contentId: {}, platform: {}, window: {}h",
                    contentId, platform, windowHours, e);
            throw new JobExecutionException(e, false);
        }
    }
}
