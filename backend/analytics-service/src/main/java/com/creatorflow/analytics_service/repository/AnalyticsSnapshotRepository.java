package com.creatorflow.analytics_service.repository;

import com.creatorflow.analytics_service.model.AnalyticsSnapshot;
import com.creatorflow.analytics_service.model.PlatformType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AnalyticsSnapshotRepository extends JpaRepository<AnalyticsSnapshot, UUID> {

    Optional<AnalyticsSnapshot> findByContentIdAndOwnerIdAndPlatformAndWindowHours(
            UUID contentId, UUID ownerId, PlatformType platform, int windowHours);
}
