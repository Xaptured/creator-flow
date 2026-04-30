package com.creatorflow.media_service.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "youtube_channels")
@Getter
@Setter
@NoArgsConstructor
public class YouTubeChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "platform_account_id", nullable = false, unique = true)
    private UUID platformAccountId;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "channel_id", nullable = false)
    private String channelId;

    @Column(name = "channel_name", nullable = false)
    private String channelName;

    @Column(name = "channel_thumbnail")
    private String channelThumbnail;

    @Column(name = "subscriber_count", nullable = false)
    private Long subscriberCount = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
