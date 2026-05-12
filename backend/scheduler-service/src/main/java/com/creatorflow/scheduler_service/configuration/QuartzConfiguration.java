package com.creatorflow.scheduler_service.configuration;

import com.creatorflow.scheduler_service.jobs.PublishJob;
import com.creatorflow.scheduler_service.jobs.TokenRefreshJob;
import org.quartz.JobBuilder;
import org.quartz.JobDetail;
import org.quartz.SimpleScheduleBuilder;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class QuartzConfiguration {

    /**
     * How often the PublishJob polls for due content, in seconds.
     * Default: 30 seconds — short enough for near-instant publish feel,
     * long enough to avoid hammering the DB.
     */
    @Value("${app.scheduler.publish-job-interval-seconds}")
    private int publishJobIntervalSeconds;

    /**
     * How often the TokenRefreshJob checks for near-expiry platform OAuth tokens, in seconds.
     * Default: 3600 seconds (1 hour) — frequent enough to catch tokens expiring within the
     * refresh-ahead window, without hammering the DB or OAuth providers.
     */
    @Value("${app.scheduler.token-refresh-job-interval-seconds}")
    private int tokenRefreshJobIntervalSeconds;

    @Bean
    public JobDetail publishJobDetail() {
        return JobBuilder.newJob(PublishJob.class)
                .withIdentity("publishJob", "creatorflow")
                .withDescription("Polls DB for due SCHEDULED content and fires CONTENT_READY_TO_PUBLISH events")
                .storeDurably()
                .build();
    }

    @Bean
    public Trigger publishJobTrigger(JobDetail publishJobDetail) {
        return TriggerBuilder.newTrigger()
                .forJob(publishJobDetail)
                .withIdentity("publishJobTrigger", "creatorflow")
                .withSchedule(
                        SimpleScheduleBuilder.simpleSchedule()
                                .withIntervalInSeconds(publishJobIntervalSeconds)
                                .repeatForever())
                .startNow()
                .build();
    }

    @Bean
    public JobDetail tokenRefreshJobDetail() {
        return JobBuilder.newJob(TokenRefreshJob.class)
                .withIdentity("tokenRefreshJob", "creatorflow")
                .withDescription("Proactively refreshes expiring platform OAuth tokens via media-service")
                .storeDurably()
                .build();
    }

    @Bean
    public Trigger tokenRefreshJobTrigger(JobDetail tokenRefreshJobDetail) {
        return TriggerBuilder.newTrigger()
                .forJob(tokenRefreshJobDetail)
                .withIdentity("tokenRefreshJobTrigger", "creatorflow")
                .withSchedule(
                        SimpleScheduleBuilder.simpleSchedule()
                                .withIntervalInSeconds(tokenRefreshJobIntervalSeconds)
                                .repeatForever())
                .startNow()
                .build();
    }
}
