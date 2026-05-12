package com.creatorflow.scheduler_service.jobs;

import com.creatorflow.scheduler_service.client.MediaServiceClient;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Quartz job that proactively refreshes expiring OAuth tokens for all connected platforms.
 *
 * Fires on a fixed interval (configured via app.scheduler.token-refresh-job-interval-seconds).
 * Delegates the actual refresh logic to media-service via an internal HTTP endpoint,
 * keeping OAuth client credentials and token exchange logic in one place.
 *
 * Design:
 *   - This job is intentionally thin: it calls media-service and logs the outcome.
 *   - Media-service is responsible for finding near-expiry accounts and refreshing them.
 *   - A failure to reach media-service is logged as ERROR but does not throw
 *     JobExecutionException — missing a refresh cycle is recoverable on the next run.
 *   - Individual account refresh failures are handled inside media-service and
 *     reported in the summary counts.
 *
 * Idempotency: safe to fire repeatedly — each platform OAuth service checks whether
 * a refresh is actually needed before calling the provider.
 */
@Component
public class TokenRefreshJob implements Job {

    private static final Logger log = LoggerFactory.getLogger(TokenRefreshJob.class);

    private final MediaServiceClient mediaServiceClient;

    public TokenRefreshJob(MediaServiceClient mediaServiceClient) {
        this.mediaServiceClient = mediaServiceClient;
    }

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        log.info("TokenRefreshJob: starting proactive token refresh run");

        MediaServiceClient.TokenRefreshResult result = mediaServiceClient.refreshExpiringTokens();

        if (result == null) {
            log.error("TokenRefreshJob: media-service did not respond — refresh run aborted. " +
                    "Tokens may expire if this persists. Check media-service health.");
            return;
        }

        if (result.attempted() == 0) {
            log.debug("TokenRefreshJob: no tokens require refresh at this time");
            return;
        }

        if (result.failed() > 0) {
            log.warn("TokenRefreshJob: refresh run completed with failures — " +
                    "attempted={} succeeded={} failed={} refreshedAt={}",
                    result.attempted(), result.succeeded(), result.failed(), result.refreshedAt());
        } else {
            log.info("TokenRefreshJob: refresh run completed successfully — " +
                    "attempted={} succeeded={} refreshedAt={}",
                    result.attempted(), result.succeeded(), result.refreshedAt());
        }
    }
}
