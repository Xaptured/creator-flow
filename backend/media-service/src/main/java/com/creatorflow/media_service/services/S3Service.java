package com.creatorflow.media_service.services;

import com.creatorflow.media_service.configuration.AwsProperties;
import com.creatorflow.media_service.exception.S3FetchException;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
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

    public PresignedGetObjectRequest generateGetUrl(String s3Key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(awsProperties.getBucketName())
                .key(s3Key)
                .build();

        return s3Presigner.presignGetObject(r -> r
                .signatureDuration(Duration.ofHours(awsProperties.getReadUrlExpiryHours()))
                .getObjectRequest(getObjectRequest));
    }

    public byte[] fetchObject(String s3Key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(awsProperties.getBucketName())
                .key(s3Key)
                .build();

        try (ResponseInputStream<GetObjectResponse> s3Object = s3Client.getObject(getObjectRequest)) {
            return s3Object.readAllBytes();
        } catch (NoSuchKeyException e) {
            throw new S3FetchException("S3 object not found: " + s3Key, e);
        } catch (IOException e) {
            throw new S3FetchException("Failed to read S3 object: " + s3Key, e);
        }
    }
}
