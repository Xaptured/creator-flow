package com.creatorflow.scheduler_service.repository;

import com.creatorflow.scheduler_service.model.Content;
import com.creatorflow.scheduler_service.model.ContentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContentRepository extends JpaRepository<Content, UUID> {

    Optional<Content> findByIdAndOwnerId(UUID id, UUID ownerId);

    @Query("SELECT c FROM Content c WHERE c.status = :status AND c.scheduledAt <= :now")
    List<Content> findDueContent(
            @Param("status") ContentStatus status,
            @Param("now") LocalDateTime now
    );
}
