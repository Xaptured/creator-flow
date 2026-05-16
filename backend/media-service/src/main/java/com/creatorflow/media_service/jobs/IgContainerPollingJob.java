package com.creatorflow.media_service.jobs;

import com.creatorflow.media_service.model.IgContainerStatus;
import com.creatorflow.media_service.model.IgContainerTracking;
import com.creatorflow.media_service.repository.IgContainerTrackingRepository;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

/**
 * Quartz job that completes Step 2 of the Instagram async publish flow.
 *
 * <p>Fires on a configurable schedule (default every 30 s) and delegates each
 * container row to {@link IgContainerPollingProcessor#process} which runs inside
 * its own Spring-managed transaction. The delegation is intentional: self-calls
 * from a {@code @Scheduled} / Quartz {@code execute()} method bypass the Spring
 * proxy, so {@code @Transactional} would have no effect if the logic lived here.</p>
 *
 * <h3>Status machine (ig_container_tracking.status)</h3>
 * <pre>
 *   PENDING
 *     │   (first poll — CAS claims the row)
 *     ▼
 *   PROCESSING  ←── IN_PROGRESS from Instagram
 *     │
 *     ├── FINISHED → publishContainer() → emit CONTENT_PUBLISHED → content.status = PUBLISHED
 *     └── ERROR    → emit CONTENT_FAILED → content.status = FAILED, store error message
 *
 *   PENDING / PROCESSING → ERROR if createdAt > timeout threshold
 * </pre>
 */
@Component
public class IgContainerPollingJob implements Job {

    private static final Logger log = LoggerFactory.getLogger(IgContainerPollingJob.class);

    private static final Set<IgContainerStatus> ACTIVE_STATUSES =
            Set.of(IgContainerStatus.PENDING, IgContainerStatus.PROCESSING);

    private final IgContainerTrackingRepository igContainerTrackingRepository;
    private final IgContainerPollingProcessor processor;

    public IgContainerPollingJob(IgContainerTrackingRepository igContainerTrackingRepository,
                                 IgContainerPollingProcessor processor) {
        this.igContainerTrackingRepository = igContainerTrackingRepository;
        this.processor = processor;
    }

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        List<IgContainerTracking> active = igContainerTrackingRepository.findByStatusIn(ACTIVE_STATUSES);

        if (active.isEmpty()) {
            log.debug("IgContainerPollingJob: no active containers to poll");
            return;
        }

        log.info("IgContainerPollingJob: polling {} container(s)", active.size());

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        for (IgContainerTracking tracking : active) {
            try {
                processor.process(tracking, now);
            } catch (Exception e) {
                // Guard: one bad container must never abort the rest of the batch
                log.error("IgContainerPollingJob: unexpected error for contentId: {} — skipping",
                        tracking.getContentId(), e);
            }
        }
    }
}
