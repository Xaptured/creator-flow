package com.creatorflow.media_service.repository;

import com.creatorflow.media_service.model.MediaFile;
import com.creatorflow.media_service.model.MediaStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, UUID> {

    Optional<MediaFile> findByIdAndOwnerId(UUID id, UUID ownerId);

    Optional<MediaFile> findByOwnerIdAndOriginalNameAndStatus(UUID ownerId, String originalName, MediaStatus status);

    boolean existsByOwnerIdAndOriginalNameAndStatus(UUID ownerId, String originalName, MediaStatus status);
}
