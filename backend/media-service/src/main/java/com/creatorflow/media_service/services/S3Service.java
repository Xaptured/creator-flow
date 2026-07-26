package com.creatorflow.media_service.services;

import com.creatorflow.media_service.configuration.AwsProperties;
import com.creatorflow.media_service.exception.S3FetchException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.time.Duration;

@Service
public class S3Service {

    private static final Logger log = LoggerFactory.getLogger(S3Service.class);

    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    private final AwsProperties awsProperties;

    public S3Service(S3Presigner s3Presigner, S3Client s3Client, AwsProperties awsProperties) {
        this.s3Presigner = s3Presigner;
        this.s3Client = s3Client;
        this.awsProperties = awsProperties;
    }

    public PresignedPutObjectRequest generatePutUrl(String s3Key, String mimeType) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(awsProperties.getBucketName())
                .key(s3Key)
                .contentType(mimeType)
                .build();

        return s3Presigner.presignPutObject(r -> r
                .signatureDuration(Duration.ofMinutes(awsProperties.getUploadUrlExpiryMinutes()))
                .putObjectRequest(putObjectRequest));
    }

    /**
     * Generate a presigned GET URL using the configured default expiry (app.aws.read-url-expiry-hours).
     */
    public PresignedGetObjectRequest generateGetUrl(String s3Key) {
        return generateGetUrl(s3Key, Duration.ofHours(awsProperties.getReadUrlExpiryHours()));
    }

    /**
     * Generate a presigned GET URL with a custom expiry duration.
     * Use this when the default 1-hour expiry is insufficient — e.g. Instagram publish,
     * where Meta's CDN fetches the URL asynchronously and may do so well after the initial call.
     */
    public PresignedGetObjectRequest generateGetUrl(String s3Key, Duration expiry) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(awsProperties.getBucketName())
                .key(s3Key)
                .build();

        return s3Presigner.presignGetObject(r -> r
                .signatureDuration(expiry)
                .getObjectRequest(getObjectRequest));
    }

    /**
     * Server-side copy within the bucket. Used by CF-96 to promote a selected
     * thumbnail frame from the temporary {@code thumbnails/} prefix to its
     * permanent key (frames prefix carries an S3 lifecycle expiry).
     */
    public void copyObject(String sourceKey, String destKey) {
        log.info("Copying S3 object: {} -> {}",
                sourceKey.substring(0, Math.min(sourceKey.length(), 40)),
                destKey.substring(0, Math.min(destKey.length(), 40)));
        s3Client.copyObject(CopyObjectRequest.builder()
                .sourceBucket(awsProperties.getBucketName())
                .sourceKey(sourceKey)
                .destinationBucket(awsProperties.getBucketName())
                .destinationKey(destKey)
                .build());
    }

    public void deleteObject(String s3Key) {
        log.info("Deleting S3 object: key={}", s3Key.substring(0, Math.min(s3Key.length(), 30)));
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(awsProperties.getBucketName())
                .key(s3Key)
                .build());
    }

    public byte[] fetchObject(String s3Key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(awsProperties.getBucketName())
                .key(s3Key)
                .build();

        try (ResponseInputStream<GetObjectResponse> s3Object = s3Client.getObject(getObjectRequest)) {
            return s3Object.readAllBytes();
        } catch (NoSuchKeyException e) {
            log.error("S3 object not found: key={}", s3Key);
            throw new S3FetchException(s3Key, "S3 object not found for key prefix: " + s3Key.substring(0, Math.min(s3Key.length(), 30)), e);
        } catch (IOException e) {
            log.error("Failed to read S3 object: key={}", s3Key, e);
            throw new S3FetchException(s3Key, "Failed to read S3 object — storage error", e);
        }
    }
}
