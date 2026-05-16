package com.creatorflow.media_service.repository;

import com.creatorflow.media_service.model.IgContainerStatus;
import com.creatorflow.media_service.model.IgContainerTracking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IgContainerTrackingRepository extends JpaRepository<IgContainerTracking, UUID> {

    Optional<IgContainerTracking> findByContentId(UUID contentId);

    /**
     * Finds all tracking rows whose container is in one of the given statuses.
     * Used by {@link com.creatorflow.media_service.jobs.IgContainerPollingJob} to
     * discover containers that still need polling.
     */
    List<IgContainerTracking> findByStatusIn(Collection<IgContainerStatus> statuses);

    /**
     * CAS-style update: atomically transitions status from {@code expectedStatus} to
     * {@code newStatus} only if the row still holds {@code expectedStatus}.
     * Returns the number of rows updated (0 = another concurrent run already claimed it).
     * Prevents double-polling and double-publishing without a separate advisory lock.
     */
    @Modifying
    @Query("""
            UPDATE IgContainerTracking t
               SET t.status    = :newStatus,
                   t.updatedAt = :now
             WHERE t.id        = :id
               AND t.status    = :expectedStatus
            """)
    int casStatus(
            @Param("id") UUID id,
            @Param("expectedStatus") IgContainerStatus expectedStatus,
            @Param("newStatus") IgContainerStatus newStatus,
            @Param("now") LocalDateTime now
    );
}
