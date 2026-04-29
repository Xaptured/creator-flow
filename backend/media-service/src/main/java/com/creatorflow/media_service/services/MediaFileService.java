package com.creatorflow.media_service.services;

import com.creatorflow.media_service.configuration.AwsProperties;
import com.creatorflow.media_service.dto.request.ConfirmUploadRequest;
import com.creatorflow.media_service.dto.request.UploadUrlRequest;
import com.creatorflow.media_service.dto.response.MediaFileResponse;
import com.creatorflow.media_service.dto.response.UploadUrlResponse;
import com.creatorflow.media_service.exception.MediaAlreadyConfirmedException;
import com.creatorflow.media_service.exception.MediaAlreadyUploadedException;
import com.creatorflow.media_service.exception.MediaNotFoundException;
import com.creatorflow.media_service.model.MediaFile;
import com.creatorflow.media_service.model.MediaStatus;
import com.creatorflow.media_service.repository.MediaFileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.time.LocalDateTime;
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

    private final MediaFileRepository mediaFileRepository;
    private final S3PresignService s3PresignService;
    private final S3Client s3Client;
    private final AwsProperties awsProperties;

    public MediaFileService(MediaFileRepository mediaFileRepository,
                            S3PresignService s3PresignService,
                            S3Client s3Client,
                            AwsProperties awsProperties) {
        this.mediaFileRepository = mediaFileRepository;
        this.s3PresignService = s3PresignService;
        this.s3Client = s3Client;
        this.awsProperties = awsProperties;
    }

    @Transactional
    public UploadUrlResponse createUploadUrl(UploadUrlRequest request) {
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

        PresignedPutObjectRequest presigned = s3PresignService.generatePutUrl(
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
            throw new IllegalStateException("File not found in S3 — upload may have failed. Please retry the upload.");
        }

        mediaFile.setStatus(MediaStatus.UPLOADED);
        mediaFileRepository.save(mediaFile);

        return toResponse(mediaFile, null);
    }

    @Transactional(readOnly = true)
    public MediaFileResponse getMediaFile(UUID mediaId, UUID ownerId) {
        MediaFile mediaFile = mediaFileRepository
                .findByIdAndOwnerId(mediaId, ownerId)
                .orElseThrow(() -> new MediaNotFoundException(mediaId));

        String readUrl = s3PresignService.generateGetUrl(mediaFile.getS3Key()).url().toString();
        return toResponse(mediaFile, readUrl);
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
