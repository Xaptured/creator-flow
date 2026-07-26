package com.creatorflow.media_service.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * S3 broker for sibling services (ai-service vision pipeline, CF-96).
 *
 * <p>ai-service holds no AWS credentials by design — it obtains short-lived
 * presigned URLs from these methods instead. All keys are validated against an
 * allowlist of prefixes so a compromised internal caller cannot read or write
 * arbitrary bucket locations.</p>
 */
@Service
public class InternalMediaService {

    private static final Logger log = LoggerFactory.getLogger(InternalMediaService.class);

    /** Prefixes internal callers may touch: original uploads + temporary thumbnail frames. */
    private static final String UPLOADS_PREFIX = "uploads/";
    private static final String THUMBNAILS_PREFIX = "thumbnails/";

    private static final Duration PRESIGN_EXPIRY = Duration.ofMinutes(15);

    private final S3Service s3Service;

    public InternalMediaService(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    /** Presigned GET for an existing object (15 min). */
    public String presignRead(String s3Key) {
        validateKey(s3Key);
        return s3Service.generateGetUrl(s3Key, PRESIGN_EXPIRY).url().toString();
    }

    /** Presigned PUT for a new object (15 min). */
    public String presignWrite(String s3Key, String mimeType) {
        validateKey(s3Key);
        if (mimeType == null || mimeType.isBlank()) {
            throw new IllegalArgumentException("mimeType is required");
        }
        return s3Service.generatePutUrl(s3Key, mimeType).url().toString();
    }

    /** Server-side copy (winner frame → permanent key). */
    public void copy(String sourceKey, String destKey) {
        validateKey(sourceKey);
        validateKey(destKey);
        s3Service.copyObject(sourceKey, destKey);
    }

    /**
     * Rejects keys outside the allowed prefixes, empty keys, and traversal
     * attempts. Defence-in-depth on top of the shared-secret header.
     */
    private void validateKey(String s3Key) {
        if (s3Key == null || s3Key.isBlank()) {
            throw new IllegalArgumentException("s3Key is required");
        }
        if (s3Key.contains("..") || s3Key.startsWith("/")) {
            log.warn("InternalMediaService: rejected suspicious s3Key");
            throw new IllegalArgumentException("Invalid s3Key");
        }
        if (!s3Key.startsWith(UPLOADS_PREFIX) && !s3Key.startsWith(THUMBNAILS_PREFIX)) {
            log.warn("InternalMediaService: rejected s3Key outside allowed prefixes");
            throw new IllegalArgumentException(
                    "s3Key must start with '" + UPLOADS_PREFIX + "' or '" + THUMBNAILS_PREFIX + "'");
        }
    }
}
