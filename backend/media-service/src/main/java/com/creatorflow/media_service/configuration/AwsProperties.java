package com.creatorflow.media_service.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.aws")
public class AwsProperties {

    private String region;
    private String bucketName;
    private int uploadUrlExpiryMinutes;
    private int readUrlExpiryHours;
    private long maxFileSizeBytes;

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getBucketName() { return bucketName; }
    public void setBucketName(String bucketName) { this.bucketName = bucketName; }

    public int getUploadUrlExpiryMinutes() { return uploadUrlExpiryMinutes; }
    public void setUploadUrlExpiryMinutes(int uploadUrlExpiryMinutes) { this.uploadUrlExpiryMinutes = uploadUrlExpiryMinutes; }

    public int getReadUrlExpiryHours() { return readUrlExpiryHours; }
    public void setReadUrlExpiryHours(int readUrlExpiryHours) { this.readUrlExpiryHours = readUrlExpiryHours; }

    public long getMaxFileSizeBytes() { return maxFileSizeBytes; }
    public void setMaxFileSizeBytes(long maxFileSizeBytes) { this.maxFileSizeBytes = maxFileSizeBytes; }
}
