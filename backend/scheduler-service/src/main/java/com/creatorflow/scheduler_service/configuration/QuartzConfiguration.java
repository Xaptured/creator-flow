package com.creatorflow.scheduler_service.configuration;

import com.creatorflow.scheduler_service.jobs.PublishJob;
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
}
