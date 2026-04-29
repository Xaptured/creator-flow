package com.creatorflow.media_service.services;

import com.creatorflow.media_service.configuration.AwsProperties;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.Duration;

@Service
public class S3PresignService {

    private final S3Presigner s3Presigner;
    private final AwsProperties awsProperties;

    public S3PresignService(S3Presigner s3Presigner, AwsProperties awsProperties) {
        this.s3Presigner = s3Presigner;
        this.awsProperties = awsProperties;
    }

    /**
     * Generates a presigned PUT URL for direct browser-to-S3 upload.
     * Expiry: configurable via app.aws.upload-url-expiry-minutes (default 15).
     */
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
     * Generates a presigned GET URL for serving media without exposing public S3 URLs.
     * Expiry: configurable via app.aws.read-url-expiry-hours (default 1).
     */
    public PresignedGetObjectRequest generateGetUrl(String s3Key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(awsProperties.getBucketName())
                .key(s3Key)
                .build();

        return s3Presigner.presignGetObject(r -> r
                .signatureDuration(Duration.ofHours(awsProperties.getReadUrlExpiryHours()))
                .getObjectRequest(getObjectRequest));
    }
}
