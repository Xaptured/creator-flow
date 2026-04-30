package com.creatorflow.scheduler_service.configuration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.SnsClientBuilder;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.SqsClientBuilder;

import java.net.URI;

@Configuration
@EnableConfigurationProperties(AwsProperties.class)
public class AwsConfiguration {

    private static final Logger log = LoggerFactory.getLogger(AwsConfiguration.class);

    private final AwsProperties awsProperties;

    public AwsConfiguration(AwsProperties awsProperties) {
        this.awsProperties = awsProperties;
    }

    @Bean
    public SnsClient snsClient() {
        Region region = Region.of(awsProperties.getRegion());

        SnsClientBuilder builder = SnsClient.builder()
                .region(region)
                .credentialsProvider(DefaultCredentialsProvider.create())
                .httpClient(UrlConnectionHttpClient.builder().build());

        if (isLocalOverride()) {
            URI endpoint = URI.create(awsProperties.getEndpointOverride());
            log.info("SNS client → LocalStack endpoint: {}", endpoint);
            builder.endpointOverride(endpoint);
        } else {
            log.info("SNS client → real AWS (region: {})", region);
        }

        return builder.build();
    }

    @Bean
    public SqsClient sqsClient() {
        Region region = Region.of(awsProperties.getRegion());

        SqsClientBuilder builder = SqsClient.builder()
                .region(region)
                .credentialsProvider(DefaultCredentialsProvider.create())
                .httpClient(UrlConnectionHttpClient.builder().build());

        if (isLocalOverride()) {
            URI endpoint = URI.create(awsProperties.getEndpointOverride());
            log.info("SQS client → LocalStack endpoint: {}", endpoint);
            builder.endpointOverride(endpoint);
        } else {
            log.info("SQS client → real AWS (region: {})", region);
        }

        return builder.build();
    }

    /**
     * Returns {@code true} when the endpoint override property is configured,
     * indicating we should point the SDK at LocalStack rather than real AWS.
     */
    private boolean isLocalOverride() {
        String override = awsProperties.getEndpointOverride();
        return override != null && !override.isBlank();
    }
}
