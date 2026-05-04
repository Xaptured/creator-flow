package com.creatorflow.media_service.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "app.aws")
public class AwsProperties {

    private String region;
    private String endpointOverride;
    private String bucketName;
    private int uploadUrlExpiryMinutes;
    private int readUrlExpiryHours;
    private long maxFileSizeBytes;
    private Map<String, String> queues = new HashMap<>();
    private Map<String, String> topics = new HashMap<>();

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getEndpointOverride() { return endpointOverride; }
    public void setEndpointOverride(String endpointOverride) { this.endpointOverride = endpointOverride; }

    public String getBucketName() { return bucketName; }
    public void setBucketName(String bucketName) { this.bucketName = bucketName; }

    public int getUploadUrlExpiryMinutes() { return uploadUrlExpiryMinutes; }
    public void setUploadUrlExpiryMinutes(int uploadUrlExpiryMinutes) { this.uploadUrlExpiryMinutes = uploadUrlExpiryMinutes; }

    public int getReadUrlExpiryHours() { return readUrlExpiryHours; }
    public void setReadUrlExpiryHours(int readUrlExpiryHours) { this.readUrlExpiryHours = readUrlExpiryHours; }

    public long getMaxFileSizeBytes() { return maxFileSizeBytes; }
    public void setMaxFileSizeBytes(long maxFileSizeBytes) { this.maxFileSizeBytes = maxFileSizeBytes; }

    public Map<String, String> getQueues() { return queues; }
    public void setQueues(Map<String, String> queues) { this.queues = queues; }

    public Map<String, String> getTopics() { return topics; }
    public void setTopics(Map<String, String> topics) { this.topics = topics; }
}
