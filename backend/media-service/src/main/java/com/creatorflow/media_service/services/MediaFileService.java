package com.creatorflow.media_service.services;

import com.creatorflow.media_service.configuration.AwsProperties;
import com.creatorflow.media_service.dto.CreatorflowEventMessage;
import com.creatorflow.media_service.dto.VideoUploadedPayload;
import com.creatorflow.media_service.dto.request.ConfirmUploadRequest;
import com.creatorflow.media_service.dto.request.UploadUrlRequest;
import com.creatorflow.media_service.dto.response.MediaFileResponse;
import com.creatorflow.media_service.dto.response.UploadUrlResponse;
import com.creatorflow.media_service.exception.MediaAlreadyConfirmedException;
import com.creatorflow.media_service.exception.MediaAlreadyUploadedException;
import com.creatorflow.media_service.exception.MediaNotFoundException;
import com.creatorflow.media_service.exception.S3FileNotFoundException;
import com.creatorflow.media_service.model.MediaFile;
import com.creatorflow.media_service.model.MediaStatus;
import com.creatorflow.media_service.repository.MediaFileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class MediaFileService {

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "video/mp4",
            "image/jpeg", "image/png", "image/gif",
            "audio/mpeg", "audio/wav", "audio/ogg"
    );

    private static final Logger log = LoggerFactory.getLogger(MediaFileService.class);

    private static final String VIDEO_MIME_TYPE = "video/mp4";
    private static final String MEDIA_EVENTS_TOPIC_KEY = "media-events";
    private static final String EVENT_VIDEO_UPLOADED = "MEDIA_VIDEO_UPLOADED";

    private final MediaFileRepository mediaFileRepository;
    private final S3Service s3Service;
    private final S3Client s3Client;
    private final AwsProperties awsProperties;
    private final SnsPublisher snsPublisher;
    private final ObjectMapper eventObjectMapper;

    public MediaFileService(MediaFileRepository mediaFileRepository,
                            S3Service s3Service,
                            S3Client s3Client,
                            AwsProperties awsProperties,
                            SnsPublisher snsPublisher) {
        this.mediaFileRepository = mediaFileRepository;
        this.s3Service = s3Service;
        this.s3Client = s3Client;
        this.awsProperties = awsProperties;
        this.snsPublisher = snsPublisher;
        this.eventObjectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @Transactional
    public UploadUrlResponse createUploadUrl(UploadUrlRequest request) {
        if (request.getOwnerId() == null) {
            throw new IllegalArgumentException("ownerId is required");
        }
        if (request.getFileName() == null || request.getFileName().isBlank()) {
            throw new IllegalArgumentException("fileName is required");
        }
        if (request.getMimeType() == null || request.getMimeType().isBlank()) {
            throw new IllegalArgumentException("mimeType is required");
        }

        if (!ALLOWED_MIME_TYPES.contains(request.getMimeType())) {
            throw new IllegalArgumentException(
                    "Unsupported file type: " + request.getMimeType() +
                    ". Allowed types: " + String.join(", ", ALLOWED_MIME_TYPES));
        }

        if (request.getSizeBytes() == null || request.getSizeBytes() <= 0) {
            throw new IllegalArgumentException("Invalid file size");
        }
        if (request.getSizeBytes() > awsProperties.getMaxFileSizeBytes()) {
            long maxMb = awsProperties.getMaxFileSizeBytes() / (1024 * 1024);
            throw new IllegalArgumentException("File exceeds maximum allowed size of " + maxMb + " MB");
        }

        if (mediaFileRepository.existsByOwnerIdAndOriginalNameAndStatus(
                request.getOwnerId(), request.getFileName(), MediaStatus.UPLOADED)) {
            throw new MediaAlreadyUploadedException(request.getFileName());
        }

        Optional<MediaFile> existingPending = mediaFileRepository
                .findByOwnerIdAndOriginalNameAndStatus(
                        request.getOwnerId(), request.getFileName(), MediaStatus.PENDING);

        MediaFile mediaFile;

        if (existingPending.isPresent()) {
            MediaFile existing = existingPending.get();
            boolean isStale = existing.getCreatedAt()
                    .isBefore(LocalDateTime.now().minusMinutes(awsProperties.getUploadUrlExpiryMinutes()));

            if (isStale) {
                mediaFileRepository.delete(existing);
                mediaFile = buildNewMediaFile(request);
                mediaFileRepository.save(mediaFile);
            } else {
                mediaFile = existing;
            }
        } else {
            mediaFile = buildNewMediaFile(request);
            mediaFileRepository.save(mediaFile);
        }

        PresignedPutObjectRequest presigned = s3Service.generatePutUrl(
                mediaFile.getS3Key(), request.getMimeType());

        return new UploadUrlResponse(
                mediaFile.getId(),
                presigned.url().toString(),
                presigned.expiration()
        );
    }

    @Transactional
    public MediaFileResponse confirmUpload(ConfirmUploadRequest request) {
        MediaFile mediaFile = mediaFileRepository
                .findByIdAndOwnerId(request.getMediaId(), request.getOwnerId())
                .orElseThrow(() -> new MediaNotFoundException(request.getMediaId()));

        if (mediaFile.getStatus() != MediaStatus.PENDING) {
            throw new MediaAlreadyConfirmedException(request.getMediaId());
        }

        try {
            s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(awsProperties.getBucketName())
                    .key(mediaFile.getS3Key())
                    .build());
        } catch (NoSuchKeyException e) {
            throw new S3FileNotFoundException(request.getMediaId());
        }

        mediaFile.setStatus(MediaStatus.UPLOADED);
        mediaFileRepository.save(mediaFile);

        publishVideoUploadedEvent(mediaFile);

        return toResponse(mediaFile, null);
    }

    /**
     * Emits {@code MEDIA_VIDEO_UPLOADED} to the media-events topic for confirmed
     * {@code video/mp4} uploads (CF-96 — thumbnail scoring is YouTube/video only;
     * images and audio never trigger it). Best-effort: a publish failure is logged
     * and never fails the confirm — the upload must succeed regardless of whether
     * thumbnail scoring can start.
     */
    private void publishVideoUploadedEvent(MediaFile mediaFile) {
        if (!VIDEO_MIME_TYPE.equals(mediaFile.getMimeType())) {
            return;
        }
        try {
            VideoUploadedPayload payload = new VideoUploadedPayload(
                    mediaFile.getId(),
                    mediaFile.getOwnerId(),
                    mediaFile.getS3Key(),
                    mediaFile.getOriginalName(),
                    mediaFile.getMimeType(),
                    Instant.now());
            String payloadJson = eventObjectMapper.writeValueAsString(payload);
            CreatorflowEventMessage event = CreatorflowEventMessage.of(EVENT_VIDEO_UPLOADED, payloadJson);
            snsPublisher.publishToTopic(MEDIA_EVENTS_TOPIC_KEY, event);
            log.info("MediaFileService: emitted {} for mediaId: {}", EVENT_VIDEO_UPLOADED, mediaFile.getId());
        } catch (Exception e) {
            log.error("MediaFileService: failed to emit {} for mediaId: {} — thumbnail scoring will not start: {}",
                    EVENT_VIDEO_UPLOADED, mediaFile.getId(), e.getMessage());
        }
    }

    @Transactional
    public void deleteMedia(UUID mediaId, UUID ownerId) {
        MediaFile mediaFile = mediaFileRepository
                .findByIdAndOwnerId(mediaId, ownerId)
                .orElseThrow(() -> new MediaNotFoundException(mediaId));

        s3Service.deleteObject(mediaFile.getS3Key());

        mediaFileRepository.delete(mediaFile);
    }

    @Transactional(readOnly = true)
    public MediaFileResponse getMediaFile(UUID mediaId, UUID ownerId) {
        MediaFile mediaFile = mediaFileRepository
                .findByIdAndOwnerId(mediaId, ownerId)
                .orElseThrow(() -> new MediaNotFoundException(mediaId));

        String readUrl = s3Service.generateGetUrl(mediaFile.getS3Key()).url().toString();
        return toResponse(mediaFile, readUrl);
    }

    @Transactional(readOnly = true)
    public List<MediaFileResponse> listMediaFiles(UUID ownerId) {
        return mediaFileRepository
                .findAllByOwnerIdAndStatusOrderByCreatedAtDesc(ownerId, MediaStatus.UPLOADED)
                .stream()
                .map(f -> toResponse(f, s3Service.generateGetUrl(f.getS3Key()).url().toString()))
                .toList();
    }

    private MediaFileResponse toResponse(MediaFile mediaFile, String readUrl) {
        return new MediaFileResponse(
                mediaFile.getId(),
                mediaFile.getOriginalName(),
                mediaFile.getMimeType(),
                mediaFile.getSizeBytes(),
                mediaFile.getStatus(),
                mediaFile.getCreatedAt(),
                readUrl
        );
    }

    private MediaFile buildNewMediaFile(UploadUrlRequest request) {
        UUID mediaId = UUID.randomUUID();
        String s3Key = String.format("uploads/%s/%s/%s",
                request.getOwnerId(), mediaId, request.getFileName());

        MediaFile mediaFile = new MediaFile();
        mediaFile.setId(mediaId);
        mediaFile.setOwnerId(request.getOwnerId());
        mediaFile.setS3Key(s3Key);
        mediaFile.setOriginalName(request.getFileName());
        mediaFile.setMimeType(request.getMimeType());
        mediaFile.setSizeBytes(request.getSizeBytes());
        mediaFile.setStatus(MediaStatus.PENDING);
        return mediaFile;
    }
}
