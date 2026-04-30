package com.creatorflow.media_service.repository;

import com.creatorflow.media_service.model.YouTubeChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface YouTubeChannelRepository extends JpaRepository<YouTubeChannel, UUID> {

    Optional<YouTubeChannel> findByPlatformAccountId(UUID platformAccountId);

    Optional<YouTubeChannel> findByOwnerId(UUID ownerId);
}
