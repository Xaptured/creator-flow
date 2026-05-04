package com.creatorflow.scheduler_service.services;

import com.creatorflow.scheduler_service.model.Content;
import com.creatorflow.scheduler_service.repository.ContentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Saves a single {@link Content} row in its own independent transaction.
 *
 * <p>Separated from {@link SchedulerService} so that
 * {@code @Transactional(propagation = REQUIRES_NEW)} is honoured by the Spring
 * proxy — self-calls from inside {@link SchedulerService} would bypass it.</p>
 *
 * <p>Each platform target row is committed independently: a DB failure for one
 * platform does not roll back rows that were already saved for other platforms.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentRowSaver {

    private final ContentRepository contentRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Content save(Content content) {
        Content saved = contentRepository.save(content);
        log.info("ContentRowSaver: saved contentId: {}, platform: {}, ownerId: {}",
                saved.getId(), saved.getPlatformTargets(), saved.getOwnerId());
        return saved;
    }
}
