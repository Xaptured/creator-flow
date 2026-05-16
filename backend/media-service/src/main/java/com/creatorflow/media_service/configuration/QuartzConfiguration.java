package com.creatorflow.media_service.configuration;

import com.creatorflow.media_service.jobs.IgContainerPollingJob;
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
     * How often the IgContainerPollingJob polls Instagram for container status, in seconds.
     * Default: 30 seconds — frequent enough for a responsive publish experience while
     * keeping Graph API call volume low.
     * Override via {@code IG_CONTAINER_POLL_INTERVAL_SECONDS} env var.
     */
    @Value("${app.ig-container.poll-interval-seconds}")
    private int igContainerPollIntervalSeconds;

    @Bean
    public JobDetail igContainerPollingJobDetail() {
        return JobBuilder.newJob(IgContainerPollingJob.class)
                .withIdentity("igContainerPollingJob", "creatorflow")
                .withDescription("Polls Instagram container status and publishes when FINISHED")
                .storeDurably()
                .build();
    }

    @Bean
    public Trigger igContainerPollingJobTrigger(JobDetail igContainerPollingJobDetail) {
        return TriggerBuilder.newTrigger()
                .forJob(igContainerPollingJobDetail)
                .withIdentity("igContainerPollingJobTrigger", "creatorflow")
                .withSchedule(
                        SimpleScheduleBuilder.simpleSchedule()
                                .withIntervalInSeconds(igContainerPollIntervalSeconds)
                                .repeatForever())
                .startNow()
                .build();
    }
}
