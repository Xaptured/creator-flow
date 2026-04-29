package com.creatorflow.media_service.repository;

import com.creatorflow.media_service.model.Content;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface ContentRepository extends JpaRepository<Content, UUID>, JpaSpecificationExecutor<Content> {

    Optional<Content> findByIdAndOwnerId(UUID id, UUID ownerId);
}
